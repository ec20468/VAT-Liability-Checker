"use client";

import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import type { FlowResponse } from "@/lib/schemas/flow";

const NOISE_GLSL = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+10.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 105.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

function MiniSphere({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth,
      H = canvas.offsetHeight;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(72, W / H, 0.1, 1000);
    cam.position.z = 2.9;
    const dc = document.createElement("canvas");
    dc.width = dc.height = 32;
    const ctx = dc.getContext("2d")!;
    const p = new Path2D();
    p.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill(p);
    const geo = new THREE.IcosahedronGeometry(1, 40);
    const mat = new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(dc),
      blending: THREE.NormalBlending,
      color: new THREE.Color(color),
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      shader.uniforms.radius = { value: 1.5 };
      shader.uniforms.particleSizeMin = { value: 0.009 };
      shader.uniforms.particleSizeMax = { value: 0.065 };
      shader.vertexShader = [
        "uniform float time,radius,particleSizeMin,particleSizeMax;",
        NOISE_GLSL,
        shader.vertexShader,
      ].join("\n");
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        vec3 p=position; float n=snoise(vec3(p.x*.6+time*.2,p.y*.4+time*.3,p.z*.2+time*.2));
        p+=n*.4; p*=radius/length(p); float s=mix(particleSizeMin,particleSizeMax,n); vec3 transformed=p;
      `,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "gl_PointSize = size;",
        "gl_PointSize = s;",
      );
      mat.userData.shader = shader;
    };
    const mesh = new THREE.Points(geo, mat);
    scene.add(mesh);
    let raf: number;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = performance.now() * 0.001;
      mesh.rotation.set(0, t * 0.18, t * 0.04);
      if (mat.userData.shader) mat.userData.shader.uniforms.time.value = t;
      renderer.render(scene, cam);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

function extractRate(
  conclusion: string,
): { label: string; color: string } | null {
  const c = conclusion.toLowerCase();
  if (c.includes("zero-rated") || c.includes("zero rated"))
    return { label: "Zero-rated · 0%", color: "#4caf82" };
  if (
    c.includes("standard-rated") ||
    c.includes("standard rated") ||
    c.includes("20%")
  )
    return { label: "Standard-rated · 20%", color: "#1d70b8" };
  if (c.includes("reduced") || c.includes("5%"))
    return { label: "Reduced rate · 5%", color: "#f59e0b" };
  if (c.includes("exempt")) return { label: "Exempt", color: "#8b5cf6" };
  return null;
}

type Props = {
  query: string;
  response: FlowResponse;
  onReset: () => void;
};

export function AnswerScreen({ query, response, onReset }: Props) {
  const [expandedCite, setExpandedCite] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 60);
  }, []);

  const answer = response.answer!;
  const rate = extractRate(answer.conclusion);

  return (
    <>
      <style>{`
        @keyframes _as_slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          minHeight: "calc(100dvh - 58px)",
          padding: "40px 20px 60px",
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition:
            "opacity 0.55s cubic-bezier(.16,1,.3,1), transform 0.55s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 580 }}>
          {/* ── Query strip with mini sphere ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle,rgba(76,175,130,0.15) 0%,transparent 70%)",
                }}
              />
              <MiniSphere color="#4caf82" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  color: "#6f777b",
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                Query
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(243,242,241,0.6)",
                  fontStyle: "italic",
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                "{query}"
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#4caf82",
                  boxShadow: "0 0 6px rgba(76,175,130,0.5)",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: "#6f777b",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Complete
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {rate && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    padding: "4px 14px",
                    border: `1px solid ${rate.color}`,
                    color: rate.color,
                  }}
                >
                  {rate.label}
                </span>
              )}
              {response.needsReview && (
                <span
                  style={{
                    fontSize: 9,
                    color: "#f59e0b",
                    border: "1px solid rgba(245,158,11,0.3)",
                    padding: "4px 10px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  ⚠ Verify with advisor
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: "clamp(14px, 1.3vw, 17px)",
                color: "rgba(243,242,241,0.88)",
                lineHeight: 1.65,
                borderLeft: "2px solid #1d70b8",
                paddingLeft: 14,
              }}
            >
              {answer.conclusion}
            </p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: "#6f777b",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Reasoning
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {answer.reasoning.map((bullet, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "11px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    animation: `_as_slideIn 0.4s cubic-bezier(.16,1,.3,1) ${i * 80}ms both`,
                  }}
                >
                  <div
                    style={{
                      width: 1,
                      background: "#1d70b8",
                      flexShrink: 0,
                      alignSelf: "stretch",
                      marginTop: 3,
                    }}
                  />
                  <p
                    style={{
                      fontSize: "clamp(11px, 0.9vw, 13px)",
                      color: "rgba(243,242,241,0.7)",
                      lineHeight: 1.65,
                      margin: 0,
                    }}
                  >
                    {bullet}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Citations ── */}
          {response.citations.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  color: "#6f777b",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                Sources
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {response.citations.map((c, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setExpandedCite(expandedCite === i ? null : i)
                    }
                    style={{
                      textAlign: "left",
                      background: "none",
                      border: "1px solid",
                      borderColor: expandedCite === i ? "#1d70b8" : "#252828",
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (expandedCite !== i)
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "#313535";
                    }}
                    onMouseLeave={(e) => {
                      if (expandedCite !== i)
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "#252828";
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 9,
                          color: "#1d70b8",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        {c.basePath.split("/").pop()?.replace(/-/g, " ")} · ¶
                        {c.docParagraphIndex}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#6f777b",
                          lineHeight: 1.5,
                          maxHeight: expandedCite === i ? "none" : "2.8em",
                          overflow: "hidden",
                        }}
                      >
                        {c.snippet}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        color: "#313535",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {expandedCite === i ? "▲" : "▼"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={onReset}
              style={{
                fontSize: 9,
                color: "#6f777b",
                background: "none",
                border: "1px solid #252828",
                padding: "6px 16px",
                cursor: "pointer",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "inherit",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#1d70b8";
                (e.currentTarget as HTMLElement).style.color = "#1d70b8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#252828";
                (e.currentTarget as HTMLElement).style.color = "#6f777b";
              }}
            >
              ← New query
            </button>
            <a
              href="https://www.gov.uk/government/collections/vat-notices-numeric-order"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 9,
                color: "#313535",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#6f777b")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = "#313535")
              }
            >
              ↗ GOV.UK VAT Notices
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
