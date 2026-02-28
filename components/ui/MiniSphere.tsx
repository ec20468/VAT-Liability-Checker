"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

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

export function MiniSphere({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf: number;
    let renderer: THREE.WebGLRenderer;
    let geo: THREE.IcosahedronGeometry;
    let mat: THREE.PointsMaterial;
    let particleTex: THREE.CanvasTexture;

    const init = (W: number, H: number) => {
      renderer = new THREE.WebGLRenderer({
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

      particleTex = new THREE.CanvasTexture(dc);
      geo = new THREE.IcosahedronGeometry(1, 8);
      mat = new THREE.PointsMaterial({
        map: particleTex,
        blending: THREE.NormalBlending,
        color: new THREE.Color(color),
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      });

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 0 };
        shader.uniforms.radius = { value: 1.5 };
        shader.uniforms.particleSizeMin = { value: 0.006 };
        shader.uniforms.particleSizeMax = { value: 0.018 };

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

      const tick = () => {
        raf = requestAnimationFrame(tick);
        const t = performance.now() * 0.001;
        mesh.rotation.set(0, t * 0.18, t * 0.04);
        if (mat.userData.shader) mat.userData.shader.uniforms.time.value = t;
        renderer.render(scene, cam);
      };

      tick();
    };

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        ro.disconnect();
        init(width, height);
      }
    });

    ro.observe(canvas);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      geo?.dispose();
      mat?.dispose();
      particleTex?.dispose();
      renderer?.dispose();
    };
  }, [color]);

  return <canvas ref={canvasRef} className="cs-miniSphereCanvas" />;
}
