export type XRayCase = {
  caseId: string;
  imagePath: string;
  actualLabel: "PNEUMONIA" | "NORMAL";
  modelProbability: number;
};

/*
 * PRIVACY & ETHICS NOTE:
 * Final images must come from a legitimate public, de-identified dataset.
 * Do not include patient names, IDs, dates of birth, accession numbers, or other identifying information.
 */

// Exact 5-Case Set for the current student investigation flow with real model output scores
export const xrayCases: XRayCase[] = [
  {
    caseId: "case-01",
    imagePath: "/cases/pneumonia1.png",
    actualLabel: "PNEUMONIA",
    modelProbability: 0.5522
  },
  {
    caseId: "case-02",
    imagePath: "/cases/normal2.png",
    actualLabel: "NORMAL",
    modelProbability: 0.0010
  },
  {
    caseId: "case-03",
    imagePath: "/cases/pneumonia3.png",
    actualLabel: "PNEUMONIA",
    modelProbability: 0.0090
  },
  {
    caseId: "case-04",
    imagePath: "/cases/pneumonia2.png",
    actualLabel: "PNEUMONIA",
    modelProbability: 0.6376
  },
  {
    caseId: "case-05",
    imagePath: "/cases/normal4.png",
    actualLabel: "NORMAL",
    modelProbability: 0.0431
  }
];
