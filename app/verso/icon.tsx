import { ImageResponse } from "next/og";
import Logo from "@/app/verso/ui/Logo";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6EFDC",
          color: "#C9852E",
        }}
      >
        <Logo style={{ width: 24, height: "auto" }} />
      </div>
    ),
    size,
  );
}
