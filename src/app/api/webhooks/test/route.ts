import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { WebhookTestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const parsed = WebhookTestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { campaignId: parsed.data.campaignId },
  });
  if (!campaign?.webhookUrl) {
    return NextResponse.json({ error: "Campaign webhook URL is not configured" }, { status: 404 });
  }

  const payload = {
    campaignId: campaign.campaignId,
    eventType: "webhook.test",
    sentAt: new Date().toISOString(),
    test: true,
  };
  let status = "pending";

  try {
    const response = await fetch(campaign.webhookUrl, {
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    status = response.ok ? "sent" : `failed:${response.status}`;
  } catch (error) {
    status = `failed:${error instanceof Error ? error.message : "unknown"}`;
  }

  await prisma.webhookEvent.create({
    data: {
      campaignId: campaign.campaignId,
      eventType: "webhook.test",
      payloadJson: JSON.stringify(payload),
      status,
    },
  });

  return NextResponse.json({ status });
}
