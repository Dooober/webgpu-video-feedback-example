import { default as seagulls } from './seagulls.js'
import { default as Video    } from './video.js'
import { default as Audio    } from './audio.js'
import {Pane} from "https://cdn.jsdelivr.net/npm/tweakpane@4.0.1/dist/tweakpane.min.js";

// Shader
const shader = `
@group(0) @binding(0) var<uniform> frame:                 f32;
@group(0) @binding(1) var<uniform> res:                   vec2f;
@group(0) @binding(2) var<uniform> speed:                 f32;
@group(0) @binding(3) var<uniform> large_wave_strength:   f32;
@group(0) @binding(4) var<uniform> small_wave_strength:   f32;
@group(0) @binding(5) var<uniform> interference_strength: f32;
@group(0) @binding(6) var videoSampler:                   sampler;
@group(1) @binding(0) var videoBuffer:                    texture_external;

@vertex 
fn vs( @location(0) input : vec2f ) ->  @builtin(position) vec4f {
  return vec4f( input, 0., 1.); 
}

@fragment 
fn fs( @builtin(position) pos : vec4f ) -> @location(0) vec4f {
  var p = pos.xy / res;
  var color = vec3f(0.);

  let s = frame/20. * speed;

  // Large waves
  var n : f32 = max(0., noise(vec2f(s, p.y*0.3)) - 0.3) * large_wave_strength;

  // Small waves
  n += (noise(vec2f(s*10., p.y*2.4)) - 0.5) * small_wave_strength;

  // Apply noise
  let xpos : f32 = p.x - n * n * 0.25;
  color = textureSampleBaseClampToEdge(videoBuffer, videoSampler, vec2f(xpos, p.y)).rgb;

  // Mix some random interference
  color = mix(color, vec3f(random(vec2f(p.y*frame))), n*interference_strength);
  
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
`

// Shader loop
async function main() {
  let frame = 0;

  await Video.init();

  const sg = await seagulls.init();
  

  // Tweakpane setup
  const pane = new Pane();

  const PARAMS = {
    speed: 1,
    large_waves: 1.5,
    small_waves: 0.15,
    interference: 0.3
  }

  pane.addBinding(
    PARAMS, 
    'speed', 
    {min: 0, max: 3, step:0.1}
  );

  pane.addBinding(
    PARAMS, 
    'large_waves', 
    {min: 0, max: 3, step:0.1}
  );

  pane.addBinding(
    PARAMS, 
    'small_waves', 
    {min: 0, max: 0.5, step:0.005}
  );

  pane.addBinding(
    PARAMS, 
    'interference', 
    {min: 0, max: 1, step:0.01}
  );

  sg.uniforms({ 
    frame:0, 
    res:[window.innerWidth, window.innerHeight],
    speed:1,
    large_wave_strength:1.5,
    small_wave_strength:0.15,
    interference_strength:0.3
  })
  .onframe( ()=> {
    sg.uniforms.frame = frame++;
    sg.uniforms.speed = PARAMS.speed;
    sg.uniforms.large_wave_strength = PARAMS.large_waves;
    sg.uniforms.small_wave_strength = PARAMS.small_waves;
    sg.uniforms.interference_strength = PARAMS.interference;
  })
  .textures([ Video.element ]) 
  .render( shader, { uniforms: ['frame','res', 'speed', 'large_wave_strength', 'small_wave_strength', 'interference_strength'] })
  .run()
}

main()
