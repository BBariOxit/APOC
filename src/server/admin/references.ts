import "server-only";

import type { ClientSession } from "mongoose";

import {
  contentResourceConfigs,
  type ContentRecord,
  type ContentResource,
} from "@/server/admin/content-registry";

export interface ContentDependency {
  resource: ContentResource;
  key: string;
  path: string;
}

function findReferencePaths(
  value: unknown,
  singularField: string,
  arrayFields: readonly string[],
  targetKey: string,
  path = "",
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      findReferencePaths(
        entry,
        singularField,
        arrayFields,
        targetKey,
        `${path}[${index}]`,
      ),
    );
  }
  if (!value || typeof value !== "object") {
    return [];
  }

  const paths: string[] = [];
  for (const [field, child] of Object.entries(value as ContentRecord)) {
    const childPath = path ? `${path}.${field}` : field;
    if (field === singularField && child === targetKey) {
      paths.push(childPath);
    }
    if (
      arrayFields.includes(field) &&
      Array.isArray(child) &&
      child.includes(targetKey)
    ) {
      paths.push(childPath);
    }
    paths.push(
      ...findReferencePaths(
        child,
        singularField,
        arrayFields,
        targetKey,
        childPath,
      ),
    );
  }
  return paths;
}

export async function findContentDependencies(
  contentVersionId: string,
  targetResource: ContentResource,
  targetKey: string,
  session?: ClientSession,
): Promise<ContentDependency[]> {
  const targetConfig = contentResourceConfigs[targetResource];
  const dependencies: ContentDependency[] = [];

  await Promise.all(
    (Object.entries(contentResourceConfigs) as Array<
      [ContentResource, (typeof contentResourceConfigs)[ContentResource]]
    >).map(async ([resource, config]) => {
      const documents = (await config.model
        .find({ contentVersionId })
        .session(session ?? null)
        .lean()
        .exec()) as ContentRecord[];

      for (const document of documents) {
        const ownerKey = String(document.key ?? "");
        if (resource === targetResource && ownerKey === targetKey) {
          continue;
        }
        const paths = findReferencePaths(
          document,
          targetConfig.referenceField,
          targetConfig.referenceArrayFields ?? [],
          targetKey,
        );
        paths.forEach((path) =>
          dependencies.push({ resource, key: ownerKey, path }),
        );
      }
    }),
  );

  return dependencies.sort((left, right) =>
    `${left.resource}:${left.key}:${left.path}`.localeCompare(
      `${right.resource}:${right.key}:${right.path}`,
    ),
  );
}
