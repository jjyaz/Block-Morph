import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { extractBearerToken, hashApiKey } from "@/lib/security";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const campaign = await prisma.campaign.findUnique({
    include: {
      registrations: {
        orderBy: { registeredAt: "asc" },
      },
    },
    where: { campaignId },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const bearer = extractBearerToken(request.headers.get("authorization"));
  if (!bearer || hashApiKey(bearer) !== campaign.apiKeyHash) {
    return NextResponse.json({ error: "Invalid campaign API key" }, { status: 401 });
  }

  const rows = campaign.registrations.map((registration) => ({
    capsuleId: registration.capsuleId,
    morphWallet: registration.morphWallet,
    nullifier: registration.nullifier,
    registeredAt: registration.registeredAt.toISOString(),
    tier: registration.tier,
    tierLabel: registration.tierLabel,
  }));

  const wantsCsv = request.headers.get("accept")?.includes("text/csv");
  if (wantsCsv) {
    const csv = [
      "morphWallet,capsuleId,nullifier,tier,tierLabel,registeredAt",
      ...rows.map((row) =>
        [
          row.morphWallet,
          row.capsuleId,
          row.nullifier,
          row.tier,
          row.tierLabel,
          row.registeredAt,
        ].join(","),
      ),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "content-disposition": `attachment; filename="${campaignId}-whitelist.csv"`,
        "content-type": "text/csv; charset=utf-8",
      },
    });
  }

  return NextResponse.json({ registrations: rows });
}
