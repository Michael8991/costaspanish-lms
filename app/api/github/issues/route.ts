import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";



const bugReportSchema = z.object({
  category: z.enum([
    "error",
    "critical_error",
    "improvement",
    "suggestion",
  ]),
  title: z.string().trim().min(3).max(150),
  url: z.string().trim().url().max(2048),
});

const categoryConfig = {
  error: {
    prefix: "Error",
    label: "bug",
  },
  critical_error: {
    prefix: "Error grave",
    label: "critical",
  },
  improvement: {
    prefix: "Posible mejora",
    label: "enhancement",
  },
  suggestion: {
    prefix: "Sugerencia",
    label: "suggestion",
  },
} as const;

type GitHubIssueResponse = {
  number?: number;
  html_url?: string;
  message?: string;
};

export async function POST(request: NextRequest) {
  try {
     const user = await requireAuth(request);
            if (!user) {
                return NextResponse.json({ ok: false, error: "Unauthorizez" },
                    {status:401}
                )
            }
            if (!requireRole(user,["admin","teacher"])) {
                return NextResponse.json({ ok: false, error: "Forbidden" },
                    {status:403}
                )
            }

    const body: unknown = await request.json();
    const validation = bugReportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Los datos del informe no son válidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const token = process.env.GITHUB_ISSUES_TOKEN;
    const owner = process.env.GITHUB_REPOSITORY_OWNER;
    const repository = process.env.GITHUB_REPOSITORY_NAME;

    if (!token || !owner || !repository) {
      console.error("Missing GitHub Issues environment variables");

      return NextResponse.json(
        {
          message:
            "El servicio para informar de problemas no está configurado.",
        },
        { status: 500 },
      );
    }

    const { category, title, url } = validation.data;
    const config = categoryConfig[category];

    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repository}/issues`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Agent": "CostaSpanish-LMS",
          "X-GitHub-Api-Version": "2026-03-10",
        },
        body: JSON.stringify({
          title: `[${config.prefix}] ${title}`,
          body: [
            "## Metadatos",
            "",
            `- **URL:** ${url}`,
          ].join("\n"),
          labels: [config.label],
        }),
      },
    );

    const githubData =
      (await githubResponse.json()) as GitHubIssueResponse;

    if (!githubResponse.ok) {
      console.error("GitHub issue creation failed", {
        status: githubResponse.status,
        githubMessage: githubData.message,
      });

      return NextResponse.json(
        {
          message: "GitHub no pudo crear el informe.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        message: "Informe enviado correctamente.",
        issueNumber: githubData.number,
        issueUrl: githubData.html_url,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Bug report endpoint error", error);

    return NextResponse.json(
      {
        message: "No se pudo enviar el informe.",
      },
      { status: 500 },
    );
  }
}