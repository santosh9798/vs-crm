import type {
  ActivityType,
  LeadSource as PrismaLeadSource,
} from "@prisma/client";
import type { ActivityType as UiActivity, LeadSource } from "@/lib/types";

export function toUiSource(source: PrismaLeadSource): LeadSource {
  if (source === "MetaAds") return "Meta Ads";
  if (source === "GoogleAds") return "Google Ads";
  return source;
}

export function toDbSource(source: LeadSource): PrismaLeadSource {
  if (source === "Meta Ads") return "MetaAds";
  if (source === "Google Ads") return "GoogleAds";
  return source;
}

export function toUiActivity(type: ActivityType): UiActivity {
  return type === "follow_up" ? "follow-up" : type;
}

export function toDbActivity(type: UiActivity): ActivityType {
  return type === "follow-up" ? "follow_up" : type;
}

export function iso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

export function requiredIso(d: Date) {
  return d.toISOString();
}
