import GlslCanvas from "./lib/glsl-canvas.js";

function shader(parameters) {
    const p = parameters.normalized;
    return `#version 300 es
    precision mediump float;
    #define MAX_STEPS 100
    #define MAX_DIST 100.
    #define SURF_DIST .001
    #define PI 3.14
    
    #define S smoothstep
    #define T iTime
    
    #define SPHERE_DRILL_RADIUS float(${p.sphereDrillRadius})
    #define CONE_RADIUS float(${p.coneRadius})
    #define CONE_LENGTH float(${p.coneLength})
    #define CONE_VERTICAL_OFFSET float(${p.coneVerticalOffset})
    #define DISKS float(${p.sphereDisks})
    #define DISK_THICKNESS float(${p.plateThickness})
    
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform sampler2D u_tex0;
    
    out vec4 FragColor;
    
    mat2 Rot(float a) {
        float s=sin(a * PI), c=cos(a * PI);
        return mat2(c, -s, s, c);
    }
    
    float sdBox(vec3 p, vec3 s) {
        p = abs(p)-s;
        return length(max(p, 0.))+min(max(p.x, max(p.y, p.z)), 0.);
    }
    
    float sdSphere(vec3 p, float s) {
        return length(p) - s;
    }
    
    float sdCone( in vec3 p, float r, float h ) {
      vec2 c = vec2(r, h);
      vec2 q = h*vec2(c.x/c.y,-1.0);
        
      vec2 w = vec2( length(p.xz), p.y );
      vec2 a = w - q*clamp( dot(w,q)/dot(q,q), 0.0, 1.0 );
      vec2 b = w - q*vec2( clamp( w.x/q.x, 0.0, 1.0 ), 1.0 );
      float k = sign( q.y );
      float d = min(dot( a, a ),dot(b, b));
      float s = max( k*(w.x*q.y-w.y*q.x),k*(w.y-q.y)  );
      return sqrt(d)*sign(s);
    }
    
    float sdCylinder(vec3 p, float h, float r)
    {
      vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r, h / 2.);
      return min(max(d.x,d.y),0.0) + length(max(d,0.0));
    }
    
    float opUnion(float d1, float d2) {
        return min(d1,d2);
    }
    
    float opSubtraction(float d1, float d2) {
        return max(d1,-d2);
    }
    
    vec3 opRep( in vec3 p, in vec3 c) {
        return mod(p+0.5*c,c)-0.5*c;
    }
    
    float GetDist(vec3 p) {
        float s = sdSphere(p, 1.);
        vec3 cp = p;
        cp -= vec3(.0, CONE_VERTICAL_OFFSET, -CONE_LENGTH / 2.);
        cp.yz *= Rot(.5);
        float c = sdCone(cp, CONE_RADIUS, CONE_LENGTH);
        //Space between disks
        float sbd = (2. - DISKS * DISK_THICKNESS) / (DISKS);
        //Odd number of disks
        bool ond = mod(DISKS, 2.) == 1.;
        float g = sdBox(opRep(p - vec3(.0, .0, ond ? (sbd + DISK_THICKNESS) / 2. : .0),
                vec3(.0, .0, sbd + DISK_THICKNESS)),
                vec3(1.1, 1.1, sbd / 2.));
        float d = opSubtraction(s, c);
        d = opSubtraction(d, g);
        vec3 yp = p;
        yp.yz *= Rot(.5);
        float y = sdCylinder(yp, 2., SPHERE_DRILL_RADIUS);
        d = opUnion(d, y);
        return d;
    }
    
    float RayMarch(vec3 ro, vec3 rd) {
        float dO=0.;
        
        for(int i=0; i<MAX_STEPS; i++) {
            vec3 p = ro + rd*dO;
            float dS = GetDist(p);
            dO += dS;
            if(dO>MAX_DIST || abs(dS)<SURF_DIST) break;
        }
        
        return dO;
    }
    
    vec3 GetNormal(vec3 p) {
        float d = GetDist(p);
        vec2 e = vec2(.001, 0);
        
        vec3 n = d - vec3(
            GetDist(p-e.xyy),
            GetDist(p-e.yxy),
            GetDist(p-e.yyx));
        
        return normalize(n);
    }
    
    vec3 GetRayDir(vec2 uv, vec3 p, vec3 l, float z) {
        vec3 f = normalize(l-p),
            r = normalize(cross(vec3(0,1,0), f)),
            u = cross(f,r),
            c = f*z,
            i = c + uv.x*r + uv.y*u,
            d = normalize(i);
        return d;
    }
    
    void main()
    {
        vec2 uv = (gl_FragCoord.xy-.5*u_resolution.xy)/u_resolution.y;
        vec2 m = u_mouse.xy/u_resolution.xy;
        //vec2 m = vec2(.5, .5);
    
        vec3 ro = vec3(0, 2.25, -2.25);
        ro.yz *= Rot(-m.y*3.14+1.);
        ro.xz *= Rot(-m.x*6.2831);
        
        vec3 rd = GetRayDir(uv, ro, vec3(0,0.,0), 1.);
        vec3 col = vec3(0);
       
        float d = RayMarch(ro, rd);
    
        if(d<MAX_DIST) {
            vec3 p = ro + rd * d;
            vec3 n = GetNormal(p);
            vec3 r = reflect(rd, n);
    
            float dif = dot(n, normalize(vec3(1,2,3)))*.5+.5;
            col = vec3(dif);
        }
        
        col = pow(col, vec3(.4545));	// gamma correction
        
        FragColor = vec4(col * vec3(.8, .8, .8), 1.0);
    }`;
}

let sandbox;

export default function initShader(parameters) {
    if(!sandbox) {
        sandbox = new GlslCanvas(document.getElementById('shader-canvas'));
    }
    sandbox.load(shader(parameters));
}