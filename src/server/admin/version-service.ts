import "server-only";

import { Types } from "mongoose";

import {
  contentResourceConfigs,
  pickContent,
  type ContentRecord,
  type ContentResource,
} from "@/server/admin/content-registry";
import { writeAdminAudit } from "@/server/admin/audit";
import {
  createVersionRequestSchema,
  updateRulesRequestSchema,
  updateVersionRequestSchema,
} from "@/server/admin/schemas";
import { connectToDatabase } from "@/server/db/mongoose";
import {
  ContentVersionModel,
  GameRuleDefinitionModel,
  GameRunModel,
} from "@/server/db/models";
import { ApiError } from "@/server/http/api-error";
import { gameRuleDefinitionContentSchema } from "@/server/validation/content";
import { validateContentVersionForPublish } from "@/server/validation/publish-content-version";

function versionDto(record: ContentRecord) {
  return {
    id: String(record._id),
    version: record.version,
    status: record.status,
    changelog: record.changelog,
    publishedAt:
      record.publishedAt instanceof Date
        ? record.publishedAt.toISOString()
        : record.publishedAt ?? null,
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : record.createdAt,
    updatedAt:
      record.updatedAt instanceof Date
        ? record.updatedAt.toISOString()
        : record.updatedAt,
    revision: record.__v ?? 0,
  };
}

export async function listContentVersions() {
  const versions = (await ContentVersionModel.find()
    .sort({ createdAt: -1 })
    .lean()
    .exec()) as ContentRecord[];
  const countsByVersion = await Promise.all(
    versions.map(async (version) => {
      const counts = await Promise.all(
        (Object.entries(contentResourceConfigs) as Array<
          [ContentResource, (typeof contentResourceConfigs)[ContentResource]]
        >).map(async ([resource, config]) => [
          resource,
          await config.model.countDocuments({ contentVersionId: version._id }),
        ]),
      );
      return [String(version._id), Object.fromEntries(counts)] as const;
    }),
  );
  const countMap = Object.fromEntries(countsByVersion);
  return versions.map((version) => ({
    ...versionDto(version),
    counts: countMap[String(version._id)],
  }));
}

export async function getContentVersion(contentVersionId: string) {
  const version = (await ContentVersionModel.findById(contentVersionId)
    .lean()
    .exec()) as ContentRecord | null;
  if (!version) {
    throw new ApiError(404, "VERSION_NOT_FOUND", "Content version not found");
  }
  const counts = await Promise.all(
    (Object.entries(contentResourceConfigs) as Array<
      [ContentResource, (typeof contentResourceConfigs)[ContentResource]]
    >).map(async ([resource, config]) => [
      resource,
      await config.model.countDocuments({ contentVersionId }),
    ]),
  );
  return { ...versionDto(version), counts: Object.fromEntries(counts) };
}

export async function createContentVersion(
  adminUserId: string,
  input: unknown,
) {
  const request = createVersionRequestSchema.parse(input);
  if (
    request.cloneFromVersionId &&
    !Types.ObjectId.isValid(request.cloneFromVersionId)
  ) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "cloneFromVersionId is invalid",
    );
  }

  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: unknown;
  try {
    await session.withTransaction(async () => {
      const source = request.cloneFromVersionId
        ? await ContentVersionModel.findById(request.cloneFromVersionId)
            .session(session)
            .lean()
            .exec()
        : null;
      if (request.cloneFromVersionId && !source) {
        throw new ApiError(
          404,
          "SOURCE_VERSION_NOT_FOUND",
          "Clone source version not found",
        );
      }

      const [version] = await ContentVersionModel.create(
        [
          {
            version: request.version,
            status: "draft",
            changelog: request.changelog,
            createdBy: adminUserId,
          },
        ],
        { session },
      );

      if (source) {
        const sourceRules = await GameRuleDefinitionModel.findOne({
          contentVersionId: source._id,
        })
          .session(session)
          .lean()
          .exec();
        if (sourceRules) {
          await GameRuleDefinitionModel.create(
            [
              {
                contentVersionId: version._id,
                runSetup: sourceRules.runSetup,
                statRules: sourceRules.statRules,
                dailyRules: sourceRules.dailyRules,
                expeditionRules: sourceRules.expeditionRules,
              },
            ],
            { session },
          );
        } else {
          await GameRuleDefinitionModel.create(
            [
              {
                contentVersionId: version._id,
                runSetup: {},
                statRules: {},
                dailyRules: {},
                expeditionRules: {},
              },
            ],
            { session },
          );
        }

        for (const config of Object.values(contentResourceConfigs)) {
          const sourceDocuments = (await config.model
            .find({ contentVersionId: source._id })
            .session(session)
            .lean()
            .exec()) as ContentRecord[];
          if (sourceDocuments.length === 0) {
            continue;
          }
          const clones = sourceDocuments.map((document) => ({
            contentVersionId: version._id,
            key: document.key,
            enabled: document.enabled,
            createdBy: adminUserId,
            ...pickContent(document, config.contentFields),
          }));
          await config.model.create(clones, { session });
        }
      } else {
        await GameRuleDefinitionModel.create(
          [
            {
              contentVersionId: version._id,
              runSetup: {},
              statRules: {},
              dailyRules: {},
              expeditionRules: {},
            },
          ],
          { session },
        );
      }

      const after = version.toObject() as ContentRecord;
      await writeAdminAudit({
        adminUserId,
        action: "create",
        entityType: "content_version",
        entityKey: request.version,
        contentVersionId: version._id.toString(),
        after: {
          ...after,
          cloneFromVersionId: request.cloneFromVersionId,
        },
        session,
      });
      result = versionDto(after);
    });
  } finally {
    await session.endSession();
  }
  return result;
}

export async function updateContentVersion(
  contentVersionId: string,
  adminUserId: string,
  input: unknown,
) {
  const request = updateVersionRequestSchema.parse(input);
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: unknown;
  try {
    await session.withTransaction(async () => {
      const version = await ContentVersionModel.findById(contentVersionId)
        .session(session)
        .exec();
      if (!version) {
        throw new ApiError(404, "VERSION_NOT_FOUND", "Content version not found");
      }
      if (version.status !== "draft") {
        throw new ApiError(409, "VERSION_IMMUTABLE", "Only drafts can be changed");
      }
      if (version.__v !== request.expectedVersion) {
        throw new ApiError(409, "EDIT_CONFLICT", "Version was changed by another administrator");
      }
      const before = version.toObject();
      if (request.version !== undefined) version.version = request.version;
      if (request.changelog !== undefined) version.changelog = request.changelog;
      version.increment();
      await version.save({ session });
      await writeAdminAudit({
        adminUserId,
        action: "update",
        entityType: "content_version",
        entityKey: version.version,
        contentVersionId,
        before,
        after: version.toObject(),
        session,
      });
      result = versionDto(version.toObject() as ContentRecord);
    });
  } finally {
    await session.endSession();
  }
  return result;
}

export async function deleteContentVersion(
  contentVersionId: string,
  adminUserId: string,
): Promise<void> {
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const version = await ContentVersionModel.findById(contentVersionId)
        .session(session)
        .exec();
      if (!version) {
        throw new ApiError(404, "VERSION_NOT_FOUND", "Content version not found");
      }
      if (version.status !== "draft") {
        throw new ApiError(409, "VERSION_IMMUTABLE", "Only drafts can be deleted");
      }
      if (
        await GameRunModel.exists({ contentVersionId }).session(session)
      ) {
        throw new ApiError(409, "VERSION_IN_USE", "A game run uses this version");
      }

      for (const config of Object.values(contentResourceConfigs)) {
        await config.model.deleteMany({ contentVersionId }).session(session);
      }
      await GameRuleDefinitionModel.deleteMany({ contentVersionId }).session(session);
      const before = version.toObject();
      await version.deleteOne({ session });
      await writeAdminAudit({
        adminUserId,
        action: "delete_draft",
        entityType: "content_version",
        entityKey: version.version,
        contentVersionId,
        before,
        session,
      });
    });
  } finally {
    await session.endSession();
  }
}

export async function validateContentVersion(contentVersionId: string) {
  return validateContentVersionForPublish(contentVersionId);
}

export async function publishContentVersion(
  contentVersionId: string,
  adminUserId: string,
) {
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: unknown;
  try {
    await session.withTransaction(async () => {
      const validation = await validateContentVersionForPublish(
        contentVersionId,
        session,
      );
      if (!validation.valid) {
        throw new ApiError(
          422,
          "CONTENT_INVALID",
          "Content version cannot be published",
          validation,
        );
      }
      const version = await ContentVersionModel.findById(contentVersionId)
        .session(session)
        .exec();
      if (!version || version.status !== "draft") {
        throw new ApiError(409, "VERSION_IMMUTABLE", "Only drafts can be published");
      }
      const publishedAt = new Date();
      const previous = await ContentVersionModel.findOne({ status: "published" })
        .session(session)
        .exec();
      if (previous) {
        previous.status = "archived";
        await previous.save({ session });
        await writeAdminAudit({
          adminUserId,
          action: "archive",
          entityType: "content_version",
          entityKey: previous.version,
          contentVersionId: previous._id.toString(),
          before: { status: "published" },
          after: { status: "archived", publishedAt: previous.publishedAt },
          session,
        });
      }
      const before = version.toObject();
      version.status = "published";
      version.publishedAt = publishedAt;
      await version.save({ session });
      await writeAdminAudit({
        adminUserId,
        action: "publish",
        entityType: "content_version",
        entityKey: version.version,
        contentVersionId,
        before,
        after: version.toObject(),
        session,
      });
      result = { version: versionDto(version.toObject() as ContentRecord), validation };
    });
  } finally {
    await session.endSession();
  }
  return result;
}

export async function archiveContentVersion(
  contentVersionId: string,
  adminUserId: string,
) {
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: unknown;
  try {
    await session.withTransaction(async () => {
      const version = await ContentVersionModel.findById(contentVersionId)
        .session(session)
        .exec();
      if (!version) {
        throw new ApiError(404, "VERSION_NOT_FOUND", "Content version not found");
      }
      if (version.status !== "published") {
        throw new ApiError(409, "INVALID_VERSION_STATE", "Only published content can be archived");
      }
      const before = version.toObject();
      version.status = "archived";
      await version.save({ session });
      await writeAdminAudit({
        adminUserId,
        action: "archive",
        entityType: "content_version",
        entityKey: version.version,
        contentVersionId,
        before,
        after: version.toObject(),
        session,
      });
      result = versionDto(version.toObject() as ContentRecord);
    });
  } finally {
    await session.endSession();
  }
  return result;
}

export async function getGameRules(contentVersionId: string) {
  const rules = await GameRuleDefinitionModel.findOne({ contentVersionId })
    .lean()
    .exec();
  if (!rules) {
    throw new ApiError(404, "RULES_NOT_FOUND", "Game rules not found");
  }
  return {
    id: rules._id.toString(),
    revision: rules.__v ?? 0,
    content: {
      runSetup: rules.runSetup,
      statRules: rules.statRules,
      dailyRules: rules.dailyRules,
      expeditionRules: rules.expeditionRules,
    },
  };
}

export async function updateGameRules(
  contentVersionId: string,
  adminUserId: string,
  input: unknown,
) {
  const request = updateRulesRequestSchema.parse(input);
  const content = gameRuleDefinitionContentSchema.parse(request.content);
  const mongoose = await connectToDatabase();
  const session = await mongoose.startSession();
  let result: unknown;
  try {
    await session.withTransaction(async () => {
      const version = await ContentVersionModel.findById(contentVersionId)
        .session(session)
        .select("status")
        .lean()
        .exec();
      if (!version) {
        throw new ApiError(404, "VERSION_NOT_FOUND", "Content version not found");
      }
      if (version.status !== "draft") {
        throw new ApiError(409, "VERSION_IMMUTABLE", "Only draft rules can be changed");
      }
      let rules = await GameRuleDefinitionModel.findOne({ contentVersionId })
        .session(session)
        .exec();
      if (!rules) {
        [rules] = await GameRuleDefinitionModel.create(
          [{ contentVersionId, ...content }],
          { session },
        );
        await writeAdminAudit({
          adminUserId,
          action: "create",
          entityType: "rules",
          entityKey: "game_rules",
          contentVersionId,
          after: rules.toObject(),
          session,
        });
      } else {
        if (
          request.expectedVersion !== undefined &&
          rules.__v !== request.expectedVersion
        ) {
          throw new ApiError(409, "EDIT_CONFLICT", "Rules were changed by another administrator");
        }
        const before = rules.toObject();
        rules.set(content);
        rules.increment();
        await rules.save({ session });
        await writeAdminAudit({
          adminUserId,
          action: "update",
          entityType: "rules",
          entityKey: "game_rules",
          contentVersionId,
          before,
          after: rules.toObject(),
          session,
        });
      }
      result = {
        id: rules._id.toString(),
        revision: rules.__v ?? 0,
        content,
      };
    });
  } finally {
    await session.endSession();
  }
  return result;
}
