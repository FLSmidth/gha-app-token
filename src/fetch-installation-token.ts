import { info } from "@actions/core";
import { getOctokit } from "@actions/github";
import { createAppAuth } from "@octokit/auth-app";
import { request } from "@octokit/request";

export const fetchInstallationToken = async ({
  appId,
  githubApiUrl,
  installationId,
  owner,
  permissions,
  privateKey,
  repo,
  repositories,
}: Readonly<{
  appId: string;
  githubApiUrl: URL;
  installationId?: number;
  owner: string;
  permissions?: Record<string, string>;
  privateKey: string;
  repo: string;
  repositories?: string[];
}>): Promise<string> => {
  const app = createAppAuth({
    appId,
    privateKey,
    request: request.defaults({
      baseUrl: githubApiUrl
        .toString()
        // Remove optional trailing `/`.
        .replace(/\/$/, ""),
    }),
  });

  const authApp = await app({ type: "app" });
  const octokit = getOctokit(authApp.token);
  let repos: string[] = [];
  let token: string;

  if (installationId === undefined) {
    try {
      ({
        data: { id: installationId },
      } = await octokit.rest.apps.getRepoInstallation({ owner, repo }));
    } catch (error: unknown) {
      throw new Error(
        "Could not get repo installation. Is the app installed on this repo?",
        { cause: error },
      );
    }
  }

  try {
    if (permissions && repositories) {
      repos = repositories.map((item) => {
        item = item.includes("/") ? item : item.split("/")[1];
        return item;
      });
      info(
        `Create token with the ${JSON.stringify(
          permissions,
        )} permissions to the repositories ${JSON.stringify(repos)}!`,
      );
      const { data: installation } =
        await octokit.rest.apps.createInstallationAccessToken({
          installation_id: installationId,
          permissions,
          repos,
        });
      token = installation.token;
    } else if (repositories) {
      repos = repositories.map((item) => {
        item = item.includes("/") ? item : item.split("/")[1];
        return item;
      });
      info(
        `Create token with the same permissions as installation ${installationId} for the repositories ${JSON.stringify(
          repos,
        )}!`,
      );
      const { data: installation } =
        await octokit.rest.apps.createInstallationAccessToken({
          installation_id: installationId,
          repos,
        });
      token = installation.token;
    } else if (permissions) {
      info(
        `Create token with the ${JSON.stringify(
          permissions,
        )} permissions for all the repositories that installation ${installationId}! has access to!`,
      );
      const { data: installation } =
        await octokit.rest.apps.createInstallationAccessToken({
          installation_id: installationId,
          permissions,
        });
      token = installation.token;
    } else {
      info(
        `Create token with all the permissions that installation ${installationId} has!`,
      );
      const { data: installation } =
        await octokit.rest.apps.createInstallationAccessToken({
          installation_id: installationId,
        });
      token = installation.token;
    }

    return token;
  } catch (error: unknown) {
    throw new Error("Could not create installation access token.", {
      cause: error,
    });
  }
};
