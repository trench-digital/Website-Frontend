"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface HologramImageProps {
  images: string[];
  width: number;
  height: number;
  alt: string;
}

export default function HologramImage({
  images,
  width,
  height,
  alt,
}: HologramImageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFlickering, setIsFlickering] = useState(false);
  useEffect(() => {
    // Random flicker effect
    const flickerInterval = setInterval(() => {
      // Random chance to flicker
      if (Math.random() > 0.7) {
        setIsFlickering(true);

        // Switch image during flicker
        setTimeout(() => {
          setCurrentImageIndex((prevIndex) => (prevIndex === 0 ? 1 : 0));

          // End flicker effect after image switch
          setTimeout(() => {
            setIsFlickering(false);
          }, 50 + Math.random() * 100);
        }, 50);
      }
    }, 200 + Math.random() * 300); // Random interval between checks

    return () => {
      console.log("Cleaning up flicker interval");
      clearInterval(flickerInterval);
    };
  }, [images.length]);

  return (
    <div className="relative hologram-container mt-5 mb-3">
      <div
        className={`transition-opacity duration-50 ${
          isFlickering ? "opacity-70" : "opacity-100"
        }`}
        style={{
          filter: isFlickering
            ? "brightness(1.2) contrast(1.2) hue-rotate(5deg)"
            : "none",
        }}
      >
        <Image
          src={images[currentImageIndex]}
          alt={alt}
          width={width}
          height={height}
          className="hologram-image"
          priority
        />
      </div>

      {/* CSS for the hologram effect */}
      <style jsx>{`
        .hologram-container {
          position: relative;
          overflow: hidden;
        }

        .hologram-image {
          filter: drop-shadow(0 0 5px var(--pip-glow-green));
        }
      `}</style>
    </div>
  );
}
