# Decodes the QR codes in a rendered poster PNG; exits 1 unless the decoded set equals the expected URLs.
import sys
import cv2

png, *expected = sys.argv[1:]
im = cv2.imread(png)
h, w = im.shape[:2]
ok, decoded, _, _ = cv2.QRCodeDetector().detectAndDecodeMulti(im[0 : int(h * 0.15), int(w * 0.6) : w])
got = sorted(d for d in decoded if d)
if got != sorted(expected):
    print(f"QR decode mismatch: got {got}, expected {sorted(expected)}")
    sys.exit(1)
print(f"QR decode ok: {len(got)} codes")
