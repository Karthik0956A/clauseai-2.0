"""Score paired comparison cases. This does not invent an accuracy number for retrieval."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.comparison_service import material_difference


def main() -> int:
    dataset = json.loads((Path(__file__).parent / "dataset.json").read_text())
    cases = dataset["comparisons"]
    correct = 0
    for case in cases:
        material, reason = material_difference(case["left"], case["right"])
        passed = material is case["material_change"]
        correct += int(passed)
        print(f"{case['id']}: {'pass' if passed else 'fail'} — {reason}")
    print(f"material-change cases: {correct}/{len(cases)}")
    print("Semantic pairing accuracy is not reported here because it requires EMBEDDING_MODEL and Qdrant-indexed clauses.")
    return 0 if correct == len(cases) else 1


if __name__ == "__main__":
    sys.exit(main())
