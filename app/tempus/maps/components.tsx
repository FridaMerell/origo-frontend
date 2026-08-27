"use client";

import {
  AgriculturalMap,
  CoastalMap,
  FogFeaturePreview,
  ForestFeaturePreview,
  ForestMap,
  FreshwaterMap,
  MountainMap,
  WetlandMap,
} from "./page";
import type {
  CoastalVariant,
  FogVariant,
  ForestFeatureVariant,
  ForestVariant,
  FreshwaterVariant,
  MountainVariant,
  Variant,
  WetlandVariant,
} from "./page";

export type MapBaseline =
  | "agricultural"
  | "forest"
  | "wetland"
  | "mountain"
  | "freshwater"
  | "coastal";

export type MapFeature = "fog" | "conifers";

export type MapCardGraphicProps = {
  baseline: MapBaseline;
  variant?: string;
  feature?: MapFeature;
  showGrid?: boolean;
  className?: string;
};

/**
 * Card-ready entry point for the map system. Keep `baseline` and `variant`
 * in the species data; add `feature` only when the habitat justifies it.
 */
export function MapCardGraphic({
  baseline,
  variant,
  feature,
  showGrid = false,
  className = "h-full w-full",
}: MapCardGraphicProps) {
  if (feature === "fog" && baseline === "coastal") {
    return (
      <div className={className}>
        <FogFeaturePreview variant={(variant as FogVariant | undefined) ?? "patches"} showGrid={showGrid} />
      </div>
    );
  }

  if (feature === "conifers" && baseline === "forest") {
    return (
      <div className={className}>
        <ForestFeaturePreview
          variant={(variant as ForestFeatureVariant | undefined) ?? "scattered"}
          showGrid={showGrid}
        />
      </div>
    );
  }

  switch (baseline) {
    case "agricultural":
      return (
        <div className={className}>
          <AgriculturalMap variant={(variant as Variant | undefined) ?? "open"} showGrid={showGrid} />
        </div>
      );
    case "forest":
      return (
        <div className={className}>
          <ForestMap variant={(variant as ForestVariant | undefined) ?? "old-growth"} showGrid={showGrid} />
        </div>
      );
    case "wetland":
      return (
        <div className={className}>
          <WetlandMap variant={(variant as WetlandVariant | undefined) ?? "marsh-corridor"} showGrid={showGrid} />
        </div>
      );
    case "mountain":
      return (
        <div className={className}>
          <MountainMap variant={(variant as MountainVariant | undefined) ?? "slope"} showGrid={showGrid} />
        </div>
      );
    case "freshwater":
      return (
        <div className={className}>
          <FreshwaterMap variant={(variant as FreshwaterVariant | undefined) ?? "shoreline"} showGrid={showGrid} />
        </div>
      );
    case "coastal":
      return (
        <div className={className}>
          <CoastalMap variant={(variant as CoastalVariant | undefined) ?? "sheltered-bay"} showGrid={showGrid} />
        </div>
      );
  }
}

export {
  AgriculturalMap,
  CoastalMap,
  FogFeaturePreview,
  ForestFeaturePreview,
  ForestMap,
  FreshwaterMap,
  MountainMap,
  WetlandMap,
};
