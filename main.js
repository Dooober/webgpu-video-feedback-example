import { default as seagulls } from './seagulls.js'
import { default as Video    } from './video.js'
import { default as Audio    } from './audio.js'

const shader = `
@group(0) @binding(0) var<uniform> frame: f32;
@group(0) @binding(1) var<uniform> res:   vec2f;
@group(0) @binding(2) var<uniform> audio: vec3f;
@group(0) @binding(3) var<uniform> mouse: vec3f;
@group(0) @binding(4) var backSampler:    sampler;
@group(0) @binding(5) var backBuffer:     texture_2d<f32>;
@group(0) @binding(6) var videoSampler:   sampler;
@group(1) @binding(0) var videoBuffer:    texture_external;

@vertex 
fn vs( @location(0) input : vec2f ) ->  @builtin(position) vec4f {
  return vec4f( input, 0., 1.); 
}

@fragment 
fn fs( @builtin(position) pos : vec4f ) -> @location(0) vec4f {
  let p = pos.xy / res;
  let vid = textureSampleBaseClampToEdge( videoBuffer, videoSampler, p );
  let fb  = textureSample( backBuffer, backSampler, p );
  var color = vec3f(0.);

  let q : vec2f = vec2f(fbm(p), fbm(p + vec2f(1.)));
  let r : vec2f = vec2f(fbm(p + q + vec2f(1.7, 9.2) + 0.15*frame), fbm(p + q + vec2f(8.3, 2.8) + 0.125*frame));
  let f : f32 = fbm(p + r);

  color = mix(vec3f(0.1, 0.6, 0.667), vec3f(0.667, 0.667, 0.5), clamp(f*f*4., 0., 1.));
  color = mix(color, vec3f(0., 0., 0.16), clamp(length(q), 0., 1.));
  color = mix(color, vec3f(0.667, 1., 1.), clamp(length(r.x), 0., 1.));
  color *= f*f*f + 0.6*f*f + 0.5*f;

  color.x = (vid * .05 + fb * .95).x;
  return vec4f(color, 1.);
}

fn random( v : vec2f ) -> f32 {
  return fract(sin(dot(v.xy, vec2f(12.9898, 78.233)))*43758.5453123);
}

fn noise( v : vec2f ) -> f32 {
  let i : vec2f = floor(v);
  let f : vec2f = fract(v);

  // Four corners
  let a : f32 = random(i);
  let b : f32 = random(i + vec2f(1., 0.));
  let c : f32 = random(i + vec2f(0., 1.));
  let d : f32 = random(i + vec2f(1., 1.));

  // Smooth Interpolation
  let u : vec2f = f*f*(3.-2.*f);
  return mix(a, b, u.x) + (c - a) * u.y * (1. - u.x) + (d - b) * u.x * u.y;
}

fn fbm( v : vec2f ) -> f32 {
  var vp : vec2f = v;
  var vf : f32 = 0.;
  var a : f32 = 0.5;
  let shift : vec2f = vec2f(100.);
  let octaves : i32 = 5;

  //rotate
  let rot : mat2x2<f32> = mat2x2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (var i = 0; i < octaves; i++) {
    vf += a * noise(vp);
    vp = rot * v * 2. + shift;
    a *= 0.5;
  }
  return vf;
}
`

async function main() {
  let frame = 0

  document.body.onclick = Audio.start

  await Video.init()

  const sg = await seagulls.init()

  sg.uniforms({ 
    frame:0, 
    res:[window.innerWidth, window.innerHeight],
    audio:[0,0,0],
    mouse:[0,0,0],
  })
  .onframe( ()=> {
    sg.uniforms.frame = frame++ 
    sg.uniforms.audio = [ Audio.low, Audio.mid, Audio.high ]
  })
  .textures([ Video.element ]) 
  .render( shader, { uniforms: ['frame','res', 'audio', 'mouse' ] })
  .run()
}

main()
