"use client";

import { useEffect, useRef, useState } from "react";
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

const STAGE_META: Record<string, string> = {
  classifying: "Classifying supply",
  selecting_notices: "Selecting VAT notices",
  fetching_notices: "Fetching legislation",
  scoring_paragraphs: "Scoring paragraphs",
  analysing: "Analysing evidence",
  drafting: "Drafting answer",
  clarifying: "Forming question",
};

const STAGE_ORDER = Object.keys(STAGE_META);

type StageRecord = {
  stage: string;
  detail?: string;
  completedAt?: number;
};

type Props = {
  request: {
    userText: string;
    answered?: { id: string; value: string }[];
    state?: FlowResponse["state"];
  };
  onDone: (response: FlowResponse) => void;
  onError: (message: string) => void;
};

function useMolecule(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  done: boolean,
) {
  const matRef = useRef<THREE.PointsMaterial | null>(null);

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
      // USE: The standard GOV.UK blue
      color: new THREE.Color("#1d70b8"),
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
        vec3 p=position;
        float n=snoise(vec3(p.x*.6+time*.2,p.y*.4+time*.3,p.z*.2+time*.2));
        p+=n*.4; p*=radius/length(p);
        float s=mix(particleSizeMin,particleSizeMax,n);
        vec3 transformed=p;
      `,
      );
      shader.vertexShader = shader.vertexShader.replace(
        "gl_PointSize = size;",
        "gl_PointSize = s;",
      );
      mat.userData.shader = shader;
    };
    matRef.current = mat;
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
    const onResize = () => {
      const w = canvas.offsetWidth,
        h = canvas.offsetHeight;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!matRef.current) return;
    matRef.current.color.set(done ? "#00703c" : "#1d70b8");
  }, [done]);
}

export function LoadingScreen({ request, onDone, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(Date.now());

  const [stages, setStages] = useState<StageRecord[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useMolecule(canvasRef, done);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.body) {
        onError("No response body");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone || cancelled) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "progress") {
              const { stage, detail } = event;
              setActive(stage);
              setStages((prev) => {
                const next = prev.map((s) =>
                  s.completedAt == null ? { ...s, completedAt: Date.now() } : s,
                );
                if (!next.find((s) => s.stage === stage))
                  next.push({ stage, detail });
                return next;
              });
            }
            if (event.type === "done") {
              setStages((prev) =>
                prev.map((s) =>
                  s.completedAt == null ? { ...s, completedAt: Date.now() } : s,
                ),
              );
              setActive(null);
              setDone(true);
              setTimeout(() => onDone(event.payload), 600);
            }
            if (event.type === "error") onError(event.message);
          } catch {
            /* malformed line */
          }
        }
      }
    }

    run().catch((e) => onError(e?.message ?? "Fetch failed"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (done) return;
    const id = setInterval(
      () => setElapsed(Date.now() - startRef.current),
      100,
    );
    return () => clearInterval(id);
  }, [done]);

  const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
  const completedCount = stages.filter((s) => s.completedAt != null).length;
  const pct = Math.round((completedCount / STAGE_ORDER.length) * 100);

  return (
    <>
      <style>{`
        @keyframes _ls_pulseDot { 0%,100%{opacity:1} 50%{opacity:0.15} }
        @keyframes _ls_spin      { to{transform:rotate(360deg)} }
        @keyframes _ls_slideIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        ._ls_stage { animation: _ls_slideIn 0.35s cubic-bezier(.16,1,.3,1) both; }
      `}</style>

      {/*
        No fixed overlay, no background colour.
        This sits inside your existing app shell — the Aceternity background
        shows through, header/footer stay mounted, no flash.
      */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100dvh - 58px)", // subtract your header height
          padding: "40px 20px",
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
        }}
      >
        <div
          style={{
            //sphere
            position: "relative",
            width: 300,
            height: 300,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: done
                ? "radial-gradient(circle, rgba(76,175,130,0.08) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(29,112,184,0.1) 0%, transparent 70%)",
              transition: "background 1s",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: -12,
              borderRadius: "50%",
              border: "1px solid rgba(29,112,184,0.07)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: -28,
              borderRadius: "50%",
              border: "1px solid rgba(29,112,184,0.03)",
              pointerEvents: "none",
            }}
          />
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block" }}
          />

          {/* Progress line beneath sphere */}
          <div
            style={{
              position: "absolute",
              bottom: -24,
              left: 0,
              right: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
            }}
          >
            <div
              style={{
                width: pct * 1.2,
                maxWidth: 120,
                height: 1,
                background:
                  "linear-gradient(to right, transparent, #1d70b8, transparent)",
                transition: "width 0.6s ease",
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: "rgba(29,112,184,0.35)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {done ? "complete" : `${pct}%`}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 52, width: "100%", maxWidth: 340 }}>
          <div
            style={{
              //query
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: "#6f777b",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Query
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(243,242,241,0.6)",
                fontStyle: "italic",
                borderLeft: "2px solid #1d70b8",
                paddingLeft: 10,
                lineHeight: 1.5,
              }}
            >
              "{request.userText}"
            </div>
          </div>

          {/* Pipeline header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: "#6f777b",
                textTransform: "uppercase",
              }}
            >
              Pipeline
            </span>
            <span
              style={{
                fontSize: 9,
                color: "#313535",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(elapsed)}
            </span>
          </div>

          {/* Rows */}
          {STAGE_ORDER.map((stageId, i) => {
            const live = stages.find((s) => s.stage === stageId);
            const isDone = live?.completedAt != null;
            const isActive = stageId === active;
            const isPending = !live;
            const prevLive = stages.find((s) => s.stage === STAGE_ORDER[i - 1]);
            const dur =
              isDone && prevLive?.completedAt
                ? live!.completedAt! - prevLive.completedAt
                : null;

            return (
              <div
                key={stageId}
                className={live ? "_ls_stage" : ""}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  opacity: isPending ? 0.18 : 1,
                  transition: "opacity 0.4s",
                }}
              >
                <div
                  style={{
                    width: 1,
                    flexShrink: 0,
                    marginRight: 12,
                    background: isDone
                      ? "#1d70b8"
                      : isActive
                        ? "rgba(29,112,184,0.4)"
                        : "#252828",
                    transition: "background 0.4s",
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: isDone
                        ? "#1d70b8"
                        : isActive
                          ? "#1d70b8"
                          : "#252828",
                      boxShadow: isActive
                        ? "0 0 6px rgba(29,112,184,0.7)"
                        : "none",
                      animation: isActive
                        ? "_ls_pulseDot 1.4s ease-in-out infinite"
                        : "none",
                      transition: "all 0.3s",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        lineHeight: 1,
                        color: isDone
                          ? "#3a3f42"
                          : isActive
                            ? "rgba(243,242,241,0.9)"
                            : "#252828",
                        transition: "color 0.3s",
                        marginBottom: live?.detail ? 3 : 0,
                      }}
                    >
                      {STAGE_META[stageId] ?? stageId}
                    </div>
                    {live?.detail && (
                      <div
                        style={{
                          fontSize: 9,
                          color: isDone ? "#252828" : "#6f777b",
                          letterSpacing: "0.03em",
                          lineHeight: 1,
                          transition: "color 0.4s",
                        }}
                      >
                        {live.detail}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        border: "1.5px solid #1a1d1d",
                        borderTopColor: "#1d70b8",
                        display: "inline-block",
                        animation: "_ls_spin 0.7s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {isDone && dur && (
                    <span
                      style={{
                        fontSize: 9,
                        color: "#252828",
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                      }}
                    >
                      {fmt(dur)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
