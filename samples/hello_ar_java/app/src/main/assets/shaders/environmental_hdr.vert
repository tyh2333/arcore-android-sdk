#version 300 es
layout(location = 0) in vec4 a_position;
layout(location = 1) in vec2 a_TexCoord;
layout(location = 2) in vec3 a_Normal;
out vec3 v_ViewPosition;
out vec3 v_ViewNormal;
out vec2 v_TexCoord;

// TODO: for testing:
//attribute vec4 a_position;
//attribute vec2 a_TexCoord;
//attribute vec3 a_Normal;
//
//varying vec3 v_ViewPosition;
//varying vec3 v_ViewNormal;
//varying vec2 v_TexCoord;





uniform mat4 u_ModelView;
uniform mat4 u_ModelViewProjection;

void main() {
  v_ViewPosition = (u_ModelView * a_position).xyz;
  // when comment, all model will be black:
  v_ViewNormal = normalize((u_ModelView * vec4(a_Normal, 0.0)).xyz);
//  v_ViewNormal = normalize((u_ModelView * vec4(a_Normal, 0.0)).xyz) - vec3(1.0, 1.0, 1.0);
//  v_ViewNormal = normalize((u_ModelView * vec4(a_Normal, 0.0)).xyz);
//  v_ViewNormal = a_Normal;
//  v_ViewNormal = vec3(0.0,0.5, 0.0);
  v_TexCoord = a_TexCoord;
//  gl_Position = u_ModelViewProjection * a_position;// * vec4(-1, 1, 1, 1);
  gl_Position = u_ModelViewProjection * a_position;// * vec4(1, 1, 1, 1);
}
