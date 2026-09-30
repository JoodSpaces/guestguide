"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The JOOD orb: the concierge's face. A real-time shader draws a soft pearl in JOOD's garnet, rose and cream whose surface flows
 * slowly. It is calm on purpose: idle drifts, listening widens a little, thinking flows faster, speaking breathes with the voice.
 * Respects "reduce motion" (a still frame), pauses when off-screen or when the tab is hidden, and falls back to a plain gradient
 * where WebGL is unavailable.
 */
export type OrbState = "idle" | "listening" | "thinking" | "speaking";

const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
const FRAG = [
  'precision highp float;',
  'uniform vec2 u_res;uniform float u_time,u_amp,u_listen,u_think,u_speak;',
  'vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}',
  'vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}',
  'vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}',
  'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
  'float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);',
  ' vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);',
  ' vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);',
  ' vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
  ' float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);',
  ' vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
  ' vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
  ' vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
  ' vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
  ' vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;',
  ' return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}',
  'void main(){',
  ' vec2 uv=(gl_FragCoord.xy-.5*u_res)/(.5*min(u_res.x,u_res.y));',
  ' float r=length(uv);float ang=atan(uv.y,uv.x);',
  ' float act=.5+u_amp*.5+u_listen*.25;',
  ' float wob=snoise(vec3(cos(ang)*.9,sin(ang)*.9,u_time*.16))*.7+snoise(vec3(cos(ang)*1.8,sin(ang)*1.8,u_time*.25+4.))*.3;',
  ' float R=.6+.008*wob*act+.014*u_listen+.008*u_amp;',
  ' float d=r-R;',
  ' vec2 pp=uv/R;float z=sqrt(max(0.,1.-dot(pp,pp)));vec3 n=normalize(vec3(pp,z));',
  ' float t=u_time*(.07+.12*u_think+.05*u_speak+.03*u_listen);',
  ' vec3 q=n*.55;',
  ' vec3 w=vec3(snoise(q+vec3(0.,t,0.)),snoise(q+vec3(5.2,t*1.1,1.3)),snoise(q+vec3(9.1,-t,3.7)));',
  ' float f0=snoise(q*.8+w*(.55+u_amp*.25)+vec3(0.,0.,t*.6))*.5+.5;',
  ' float f=smoothstep(.1,.9,f0);',
  ' vec3 c0=vec3(.36,.18,.18);vec3 c1=vec3(.56,.30,.30);vec3 c2=vec3(.77,.6,.6);vec3 c3=vec3(.96,.92,.86);vec3 aq=vec3(.627,.788,.796);vec3 em=vec3(1.,.376,.216);',
  ' vec3 col=mix(c0,c1,smoothstep(.0,.5,f));',
  ' col=mix(col,c2,smoothstep(.4,.9,f)*.85);',
  ' col=mix(col,c3,smoothstep(.75,1.,f)*.55);',
  ' col=mix(col,aq,smoothstep(.45,1.,w.x*.5+.5)*(.14+.12*u_listen));',
  ' col=mix(col,em,smoothstep(.6,1.,w.y*.5+.5)*(.05+.1*u_speak));',
  ' vec3 L=normalize(vec3(-.45,.55,.7));',
  ' col*=.72+.42*max(dot(n,L),0.);',
  ' float fres=pow(1.-z,2.4);vec3 irid=mix(c2,aq,.5+.5*sin(ang*1.0+u_time*.25));col+=fres*mix(c3,irid,.65)*(.5+.3*u_amp);col+=pow(z,3.)*vec3(.16,.09,.09);',
  ' float spec=pow(max(dot(reflect(-L,n),vec3(0.,0.,1.)),0.),32.);col+=spec*.22;',
  ' float a=1.-smoothstep(-.012,.01,d);',
  ' float fade=1.-smoothstep(.62,.98,r);',
  ' float glow=exp(-max(d,0.)*7.)*(.2+.18*u_amp+.1*u_listen)*fade;',
  ' vec3 gc=mix(c1,c2,.55)*glow;',
  ' gl_FragColor=vec4(col*a+gc*(1.-a),clamp(a+glow*.9*(1.-a),0.,1.));',
  '}'
].join("\n");

const FPS_CAP = 40;

interface Uniforms { amp: number; listen: number; think: number; speak: number }

export function Orb({ size = 176, state = "idle", amp = 0, label, onClick }: {
  size?: number; state?: OrbState; amp?: number; label?: string; onClick?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef<Uniforms>({ amp: 0, listen: 0, think: 0, speak: 0 });
  const [noGl, setNoGl] = useState(false);
  const redraw = useRef<() => void>(() => {});

  // what the shader should be doing now
  useEffect(() => {
    target.current = { amp, listen: state === "listening" ? 1 : 0, think: state === "thinking" ? 1 : 0, speak: state === "speaking" ? 1 : 0 };
    redraw.current();
  }, [state, amp]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) { setNoGl(true); return; }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const v = compile(gl.VERTEX_SHADER, VERT), f = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!v || !f || !prog) { setNoGl(true); return; }
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setNoGl(true); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = Object.fromEntries(["u_res", "u_time", "u_amp", "u_listen", "u_think", "u_speak"].map((n) => [n, gl.getUniformLocation(prog, n)]));
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);

    const cur: Uniforms = { amp: 0, listen: 0, think: 0, speak: 0 };
    const seed = Math.random() * 50;
    const t0 = performance.now();
    const draw = (time: number, ease: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = Math.max(2, Math.round(cv.clientWidth * dpr)), h = Math.max(2, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
      (Object.keys(cur) as (keyof Uniforms)[]).forEach((k) => { cur[k] += (target.current[k] - cur[k]) * ease; });
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.u_res, w, h); gl.uniform1f(U.u_time, time + seed);
      gl.uniform1f(U.u_amp, cur.amp); gl.uniform1f(U.u_listen, cur.listen); gl.uniform1f(U.u_think, cur.think); gl.uniform1f(U.u_speak, cur.speak);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = 0, last = 0, onScreen = true;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!onScreen || document.hidden || now - last < 1000 / FPS_CAP) return;
      last = now;
      draw((now - t0) / 1000, 0.045);
    };
    redraw.current = () => { if (reduce) { for (let i = 0; i < 40; i++) draw(3, 0.3); } };
    if (reduce) redraw.current(); else raf = requestAnimationFrame(loop);

    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0 });
    io.observe(cv);
    return () => { cancelAnimationFrame(raf); io.disconnect(); redraw.current = () => {}; gl.getExtension("WEBGL_lose_context")?.loseContext(); };
  }, []);

  const inner = (
    <div ref={wrapRef} data-state={state} style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      {noGl && (
        <div aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(circle at 34% 28%, rgba(255,240,228,.8), transparent 30%), radial-gradient(circle at 70% 75%, #A0C9CB, transparent 52%), linear-gradient(135deg, #C49898, #733635)",
          boxShadow: "0 0 46px -8px #733635",
        }} />
      )}
      <canvas ref={canvasRef} aria-hidden style={{ position: "absolute", left: "50%", top: "50%", width: "160%", height: "160%", transform: "translate(-50%, -50%)", pointerEvents: "none", display: noGl ? "none" : "block" }} />
    </div>
  );

  // One element type for every state: swapping div <-> button would remount the canvas and rebuild the WebGL context mid-call,
  // which some phones fail to do (the orb vanished).
  if (!onClick && label === undefined) return <div aria-hidden>{inner}</div>;
  return (
    <button type="button" onClick={onClick} disabled={!onClick} aria-label={label} style={{ display: "block", margin: "0 auto", background: "none", border: 0, padding: 0, cursor: onClick ? "pointer" : "default", touchAction: "manipulation" }}>
      {inner}
    </button>
  );
}
