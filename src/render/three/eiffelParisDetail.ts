import {Color,Matrix3,Mesh,MeshStandardMaterial,Vector3,type Group} from 'three';

type Detail = {info:[number,number,number,number];dimensions:[number,number,number,number];normal:[number,number,number]};
type Component = {mesh:Mesh;offsets:number[];points:Vector3[];min:Vector3;max:Vector3;size:Vector3;center:Vector3;normal:Vector3};
export interface ParisDetailAnalysis {
  enabled:boolean;
  reason:string;
  triangles:Map<Mesh,Map<number,Detail>>;
  counts:{panes:number;horizontalBars:number;verticalBars:number;roofTriangles:number;ribSegments:number;retainedEndSegments:number};
  colors:{glass:Color;stone:Color;iron:Color};
}
const close=(a:number,b:number,tolerance=0.001)=>Math.abs(a-b)<=tolerance;
const key=(p:Vector3)=>[p.x,p.y,p.z].map(v=>Math.round(v*10000)).join(':');

/** Weld equal exported positions only for recognition. Never change source geometry. */
function components(mesh:Mesh):Component[]{
  const geometry=mesh.geometry,position=geometry.attributes.position!,index=geometry.index;
  const normalMatrix=new Matrix3().getNormalMatrix(mesh.matrixWorld);
  const points=Array.from({length:position.count},(_,i)=>new Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld));
  const parents=points.map((_,i)=>i),weld=new Map<string,number>();
  const find=(i:number):number=>parents[i]===i?i:(parents[i]=find(parents[i]!));
  const union=(a:number,b:number)=>{parents[find(a)]=find(b);};
  points.forEach((p,i)=>{const k=key(p),other=weld.get(k);if(other!==undefined)union(i,other);else weld.set(k,i);});
  const vertex=(i:number)=>index?index.getX(i):i,count=index?.count??position.count;
  for(let i=0;i<count;i+=3){union(vertex(i),vertex(i+1));union(vertex(i),vertex(i+2));}
  const groups=new Map<number,number[]>();
  for(let i=0;i<count;i+=3){const root=find(vertex(i)),offsets=groups.get(root)??[];offsets.push(i);groups.set(root,offsets);}
  return [...groups.values()].map(offsets=>{
    const ids=[...new Set(offsets.flatMap(i=>[vertex(i),vertex(i+1),vertex(i+2)]))],ps=ids.map(i=>points[i]!);
    const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity);
    for(const p of ps){min.min(p);max.max(p);}
    const normal=geometry.attributes.normal?new Vector3().fromBufferAttribute(geometry.attributes.normal,vertex(offsets[0]!)).applyMatrix3(normalMatrix).normalize():new Vector3();
    return{mesh,offsets,points:ps,min,max,size:max.clone().sub(min),center:min.clone().add(max).multiplyScalar(.5),normal};
  });
}

export function analyzeParisDetail(source:Group):ParisDetailAnalysis{
  const result:ParisDetailAnalysis={enabled:false,reason:'Expected tagged architectural components missing',triangles:new Map(),counts:{panes:0,horizontalBars:0,verticalBars:0,roofTriangles:0,ribSegments:0,retainedEndSegments:0},colors:{glass:new Color(),stone:new Color(),iron:new Color()}};
  const tagged=new Map<string,Component[]>();source.updateMatrixWorld(true);
  source.traverse(object=>{
    if(!(object instanceof Mesh)||!['glass','iron','stone-light'].includes(object.userData.wf_material as string))return;
    const tag=object.userData.wf_material as string;
    if(tagged.has(tag)||Array.isArray(object.material)||!(object.material instanceof MeshStandardMaterial)||object.geometry.attributes.color){tagged.set(tag,[]);return;}
    tagged.set(tag,components(object));result.colors[tag==='stone-light'?'stone':tag as 'glass'|'iron'].copy(object.material.color);
  });
  const glass=tagged.get('glass')??[],stone=tagged.get('stone-light')??[],iron=tagged.get('iron')??[];
  const panes=glass.filter(c=>close(c.size.x,0)&&close(c.size.y,12.8)&&close(c.size.z,5.2)&&c.offsets.length===7&&c.min.z>126&&c.max.z<334&&close(Math.abs(c.normal.x),1));
  const horizontal=stone.filter(c=>close(c.size.x,0)&&close(c.size.y,.22)&&close(c.size.z,5.2)&&c.offsets.length===2);
  const vertical=iron.filter(c=>close(c.size.x,0)&&close(c.size.y,10.6)&&close(c.size.z,.14)&&c.offsets.length===2);
  const roofs=glass.filter(c=>close(c.size.x,300)&&close(c.size.y,23)&&close(c.size.z,94)&&close(c.center.x,0)&&close(c.center.z,478)&&c.offsets.length===36);
  const roof=roofs[0];
  const ribs=roof?stone.filter(c=>c.offsets.length===12&&close(c.size.x,.32)&&c.min.x>=-150.161&&c.max.x<=150.161&&c.min.z>=roof.min.z-.161&&c.max.z<=roof.max.z+.161&&c.min.y>=roof.min.y-.161&&c.max.y<=roof.max.y+.161&&close(c.center.x/15,Math.round(c.center.x/15))):[];
  const ends=ribs.filter(c=>close(Math.abs(c.center.x),150));
  result.counts={panes:panes.length,horizontalBars:horizontal.length,verticalBars:vertical.length,roofTriangles:roof?.offsets.length??0,ribSegments:ribs.length,retainedEndSegments:ends.length};
  if(panes.length!==84||horizontal.length!==84||vertical.length!==84||roofs.length!==1||ribs.length!==378||ends.length!==36)return result;
  const mark=(component:Component,data:Detail)=>{const records=result.triangles.get(component.mesh)??new Map();for(const offset of component.offsets)records.set(offset,data);result.triangles.set(component.mesh,records);};
  const usedH=new Set<Component>(),usedV=new Set<Component>();
  for(const pane of panes){
    const matches=(c:Component,out:number)=>close(c.center.z,pane.center.z)&&close(c.center.x,pane.center.x+pane.normal.x*out);
    const hs=horizontal.filter(c=>matches(c,.12)),vs=vertical.filter(c=>matches(c,.14));
    if(hs.length!==1||vs.length!==1){result.triangles.clear();result.reason='Pane/crossbar support match failed';return result;}
    const h=hs[0]!,v=vs[0]!;
    if(usedH.has(h)||usedV.has(v)||v.min.y<pane.min.y||v.max.y>pane.max.y||h.min.y<pane.min.y||h.max.y>pane.max.y){result.triangles.clear();result.reason='Crossbar support extents failed';return result;}
    usedH.add(h);usedV.add(v);
    const data:Detail={info:[1,pane.center.z,h.center.y,v.center.y],dimensions:[h.size.z,h.size.y,v.size.z,v.size.y],normal:pane.normal.toArray()};
    mark(pane,data);mark(h,{...data,info:[2,...data.info.slice(1)] as Detail['info']});mark(v,{...data,info:[3,...data.info.slice(1)] as Detail['info']});
  }
  const pos=roof!.mesh.geometry.attributes.position!,normals=roof!.mesh.geometry.attributes.normal!,idx=roof!.mesh.geometry.index,normalMatrix=new Matrix3().getNormalMatrix(roof!.mesh.matrixWorld);
  const planes=roof!.offsets.map(offset=>{
    const ids=[0,1,2].map(i=>idx?idx.getX(offset+i):offset+i),points=ids.map(i=>new Vector3().fromBufferAttribute(pos,i).applyMatrix4(roof!.mesh.matrixWorld));
    const normal=new Vector3().fromBufferAttribute(normals,ids[0]!).applyMatrix3(normalMatrix).normalize();
    const data:Detail={info:[4,15,.32,0],dimensions:[0,0,0,0],normal:normal.toArray()};
    const records=result.triangles.get(roof!.mesh)??new Map();records.set(offset,data);result.triangles.set(roof!.mesh,records);
    const geometricNormal=points[1]!.clone().sub(points[0]!).cross(points[2]!.clone().sub(points[0]!)).normalize();
    if(geometricNormal.dot(normal)<0)geometricNormal.negate();
    return{point:points[0]!,normal:geometricNormal,shadingNormal:normal,minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};
  });
  for(const rib of ribs){
    if(ends.includes(rib))continue;
    const support=planes.find(p=>rib.center.z>=p.minZ-.001&&rib.center.z<=p.maxZ+.001&&Math.abs(p.normal.dot(rib.center.clone().sub(p.point)))<.001);
    if(!support||support.normal.y<=0||rib.points.some(p=>Math.abs(support.normal.dot(p.clone().sub(support.point)))>.1601)){result.triangles.clear();result.reason=`Vault rib support plane failed at ${rib.center.toArray()}; support=${support?.normal.toArray()}; distance=${support?Math.max(...rib.points.map(p=>Math.abs(support.normal.dot(p.clone().sub(support.point))))):'missing'}`;return result;}
    mark(rib,{info:[5,15,rib.size.x,0],dimensions:[0,0,0,0],normal:support.shadingNormal.toArray()});
  }
  result.enabled=true;result.reason='Exact exported pane/bar and roof/rib support matches';return result;
}

/** Box-filter integral of a finite band. Its area stays equal to the authored width. */
export function parisBandCoverage(distance:number,width:number,footprint:number):number{
  const span=Math.max(footprint,1e-6);
  return Math.max(0,Math.min(1,(Math.min(distance+span*.5,width*.5)-Math.max(distance-span*.5,-width*.5))/span));
}

const DECLARATIONS=/* glsl */`
uniform float uParisDetailFilter;
uniform vec3 uParisDetailGlass;
uniform vec3 uParisDetailStone;
uniform vec3 uParisDetailIron;
varying vec4 vParisDetailInfo;
varying vec4 vParisDetailDimensions;
varying vec3 vParisDetailNormal;
float parisBand(float d,float width,float span){
 span=max(span,0.000001);
 return clamp((min(d+span*.5,width*.5)-max(d-span*.5,-width*.5))/span,0.0,1.0);
}
float parisDetailFar(float width,float span){return 1.0-smoothstep(1.0,2.5,width/max(span,0.000001));}
`;
const FRAGMENT=/* glsl */`
if(uParisDetailFilter>0.0 && vParisDetailInfo.x>0.5){
 vec3 supportNormal=normalize(mat3(viewMatrix)*vParisDetailNormal);
 float silhouette=smoothstep(0.12,0.35,abs(dot(supportNormal,normalize(vViewPosition))));
 vec3 detailColor=diffuseColor.rgb;
 float weight=0.0;
 if(vParisDetailInfo.x<3.5){
  vec2 span=max(fwidth(vParisPosition.zy),vec2(0.000001));
  float horizontal=parisBand(vParisPosition.z-vParisDetailInfo.y,vParisDetailDimensions.x,span.x)
   *parisBand(vParisPosition.y-vParisDetailInfo.z,vParisDetailDimensions.y,span.y);
  float vertical=parisBand(vParisPosition.z-vParisDetailInfo.y,vParisDetailDimensions.z,span.x)
   *parisBand(vParisPosition.y-vParisDetailInfo.w,vParisDetailDimensions.w,span.y);
  float farH=parisDetailFar(vParisDetailDimensions.y,span.y)*silhouette;
  float farV=parisDetailFar(vParisDetailDimensions.z,span.x)*silhouette;
  float h=horizontal*farH;
  float v=vertical*farV;
  if(vParisDetailInfo.x>1.5 && vParisDetailInfo.x<2.5)h=mix(1.0,horizontal,farH);
  if(vParisDetailInfo.x>2.5)v=mix(1.0,vertical,farV);
  vec3 paneColor=vParisDetailInfo.x<1.5?diffuseColor.rgb:uParisDetailGlass;
  vec3 stoneColor=(vParisDetailInfo.x>1.5 && vParisDetailInfo.x<2.5)?mix(diffuseColor.rgb,uParisDetailStone,farH):uParisDetailStone;
  vec3 ironColor=vParisDetailInfo.x>2.5?mix(diffuseColor.rgb,uParisDetailIron,farV):uParisDetailIron;
  detailColor=mix(mix(paneColor,stoneColor,h),ironColor,v);
  weight=1.0;
 }else{
  float span=max(fwidth(vParisPosition.x),0.000001);
  float center=floor((vParisPosition.x+vParisDetailInfo.y*.5)/vParisDetailInfo.y)*vParisDetailInfo.y;
  float coverage=parisBand(vParisPosition.x-center,vParisDetailInfo.z,span)*step(abs(center),149.0);
  weight=parisDetailFar(vParisDetailInfo.z,span)*silhouette;
  detailColor=mix(uParisDetailGlass,uParisDetailStone,coverage);
  if(vParisDetailInfo.x<4.5)detailColor=mix(diffuseColor.rgb,detailColor,weight);
  if(vParisDetailInfo.x<4.5)weight=1.0;
 }
 float blend=weight*uParisDetailFilter;
 diffuseColor.rgb=mix(diffuseColor.rgb,detailColor,blend);
 if(vParisDetailInfo.x>4.5)normal=normalize(mix(normal,supportNormal,blend));
}
`;

export function configureParisDetail(material:MeshStandardMaterial,analysis:ParisDetailAnalysis):void{
  const enabled={value:analysis.enabled?1:0};material.userData.parisDetailFilter=enabled;
  // Retain only the palette: the analysis also owns Maps keyed by imported
  // meshes, whose CPU vertex buffers should be collectible after batching.
  const glass=analysis.colors.glass.clone(),stone=analysis.colors.stone.clone(),iron=analysis.colors.iron.clone();
  const previous=material.onBeforeCompile.bind(material),previousKey=material.customProgramCacheKey.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
    previous(shader,renderer);
    shader.uniforms.uParisDetailFilter=enabled;
    shader.uniforms.uParisDetailGlass={value:glass};shader.uniforms.uParisDetailStone={value:stone};shader.uniforms.uParisDetailIron={value:iron};
    shader.vertexShader='attribute vec4 parisDetailInfo;\nattribute vec4 parisDetailDimensions;\nattribute vec3 parisDetailNormal;\nvarying vec4 vParisDetailInfo;\nvarying vec4 vParisDetailDimensions;\nvarying vec3 vParisDetailNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvParisDetailInfo=parisDetailInfo;\nvParisDetailDimensions=parisDetailDimensions;\nvParisDetailNormal=parisDetailNormal;');
    shader.fragmentShader=DECLARATIONS+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',FRAGMENT+'\n#include <emissivemap_fragment>');
  };
  material.customProgramCacheKey=()=>previousKey()+':paris-subpixel-detail-v1';
}
