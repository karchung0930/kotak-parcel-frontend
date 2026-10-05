# OCR models

The camera scanner reads printed tracking numbers with PaddlePaddle's
PP-OCRv6 tiny text detection and recognition models, in ONNX form, through
PaddleOCR.js (`lib/scanner/text.ts`). The build serves these archives from
`public/build/assets` under hashed names.

| File                               | Model                                   | SHA-256                                                            |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| `PP-OCRv6_tiny_det_onnx_infer.tar` | PP-OCRv6_tiny_det (finds lines of text) | `ff6ab415b0a6e0c488550f2fb5d5046f1719848df220b2dc21b56402a65bc05d` |
| `PP-OCRv6_tiny_rec_onnx_infer.tar` | PP-OCRv6_tiny_rec (reads each line)     | `1e13b22717b1edd89d4cde4fda272b6c17d5b505c97c2baea99da1a3a2d54b29` |

Both come unmodified from PaddlePaddle's model store, the addresses
PaddleOCR.js itself downloads them from by default:

- `https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/PP-OCRv6_tiny_det_onnx_infer.tar`
- `https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/PP-OCRv6_tiny_rec_onnx_infer.tar`

Each archive holds the model (`inference.onnx`) and its settings
(`inference.yml`).

## License

The models are Copyright PaddlePaddle Authors and licensed under the Apache
License, Version 2.0, a copy of which is in [`LICENSE`](LICENSE). Source:
[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR).
