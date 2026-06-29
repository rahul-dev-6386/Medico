import io
import logging
import cv2
import numpy as np
from PIL import Image

import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

logger = logging.getLogger(__name__)

_processor: TrOCRProcessor = None
_model: VisionEncoderDecoderModel = None
_device: str = "cuda" if torch.cuda.is_available() else "cpu"


def _load():
    global _processor, _model
    if _processor is not None:
        return
    logger.info("Loading TrOCR (microsoft/trocr-base-handwritten)...")
    _processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-handwritten")
    _model = VisionEncoderDecoderModel.from_pretrained(
        "microsoft/trocr-base-handwritten"
    ).to(_device)
    _model.eval()
    logger.info(f"TrOCR ready on {_device}")


def run(image: np.ndarray) -> tuple[str, float]:
    _load()

    if len(image.shape) == 2:
        pil_image = Image.fromarray(image)
    else:
        pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

    pixel_values = _processor(images=pil_image, return_tensors="pt").pixel_values.to(_device)

    with torch.no_grad():
        generated_ids = _model.generate(
            pixel_values,
            max_new_tokens=512,
            num_beams=4,
            early_stopping=True,
        )

    text = _processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

    scores = _model.generate(
        pixel_values,
        max_new_tokens=512,
        num_beams=4,
        early_stopping=True,
        output_scores=True,
        return_dict_in_generate=True,
    )
    logprobs = []
    for i, scores_step in enumerate(scores.scores):
        if i < len(scores.sequences[0]) - 1:
            token_id = scores.sequences[0][i + 1].item()
            logprobs.append(scores_step[0, token_id].item())
    avg_logprob = sum(logprobs) / max(len(logprobs), 1) if logprobs else 0.0
    confidence = round(float(torch.sigmoid(torch.tensor(avg_logprob)).item()), 4)

    return text.strip(), confidence
