import { MONITOR_REGIONS } from "./env.config.js";

export const DEFAULT_MONITOR_REGIONS = ["us", "europe", "asia", "australia"];

export const getMonitorRegions = () => {
  if (!MONITOR_REGIONS) return DEFAULT_MONITOR_REGIONS;

  const configured = MONITOR_REGIONS.split(",")
    .map((region) => region.trim().toLowerCase())
    .filter((region) => DEFAULT_MONITOR_REGIONS.includes(region));

  return configured.length > 0 ? configured : DEFAULT_MONITOR_REGIONS;
};

export const getMajorityThreshold = (regions) =>
  Math.floor(regions.length / 2) + 1;
