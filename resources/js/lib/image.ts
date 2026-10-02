/**
 * Shrink a phone photo before it is uploaded: at most `maxSide` pixels on
 * its longest side, re-encoded as JPEG. A 12 MP camera photo (3 to 8 MB)
 * becomes a few hundred KB, which uploads quickly on mobile data and stays
 * well under the server's 5 MB limit.
 *
 * Falls back to the original file whenever the browser cannot decode or
 * re-encode it (the server still checks the type and size).
 */

/** The types the server accepts as they are. */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type DecodedImage = {
    source: CanvasImageSource;
    width: number;
    height: number;
    release: () => void;
};

/** Decode a photo upright (browsers apply the camera's EXIF rotation). */
async function decode(file: File): Promise<DecodedImage> {
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file, {
                imageOrientation: 'from-image',
            });

            return {
                source: bitmap,
                width: bitmap.width,
                height: bitmap.height,
                release: () => bitmap.close(),
            };
        } catch {
            // Older Safari rejects the options: decode with an <img> instead.
        }
    }

    const url = URL.createObjectURL(file);

    try {
        const image = new Image();
        image.src = url;
        await image.decode();

        return {
            source: image,
            width: image.naturalWidth,
            height: image.naturalHeight,
            release: () => undefined,
        };
    } finally {
        URL.revokeObjectURL(url);
    }
}

export async function downscaleImage(
    file: File,
    maxSide = 1600,
    quality = 0.85,
): Promise<File> {
    if (!file.type.startsWith('image/') || typeof document === 'undefined') {
        return file;
    }

    try {
        const image = await decode(file);
        const scale = Math.min(
            1,
            maxSide / Math.max(image.width, image.height),
        );
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        if (!context) {
            image.release();

            return file;
        }

        context.drawImage(image.source, 0, 0, width, height);
        image.release();

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', quality),
        );

        // A small photo the server already accepts is kept as it is.
        const keepOriginal =
            scale === 1 &&
            ACCEPTED_TYPES.includes(file.type) &&
            (blob?.size ?? Infinity) >= file.size;

        if (!blob || keepOriginal) {
            return file;
        }

        const name = file.name.replace(/\.[^.]*$/, '') || 'photo';

        return new File([blob], `${name}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });
    } catch {
        return file;
    }
}
