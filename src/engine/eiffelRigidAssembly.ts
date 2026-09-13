import{composeRigidPoses,invertRigidPose,type RigidPose}from'./eiffelRigid';

export interface EiffelRigidAssemblyLink{readonly childPartId:string;readonly parentPartId:string}
export const EIFFEL_SUMMIT_RIGID_ASSEMBLIES:readonly EiffelRigidAssemblyLink[]=[
 {childPartId:'summit-crown-m073-c000',parentPartId:'summit-crown-m072-c000'},
 {childPartId:'summit-crown-m074-c000',parentPartId:'summit-crown-m072-c001'},
 {childPartId:'summit-crown-m075-c000',parentPartId:'summit-crown-m072-c001'},
 {childPartId:'summit-crown-m076-c000',parentPartId:'summit-crown-m072-c002'},
]as const;

export const eiffelRigidAssemblyRelativePose=(parentFinal:RigidPose,childFinal:RigidPose):RigidPose=>composeRigidPoses(invertRigidPose(parentFinal),childFinal);
export const eiffelRigidAssemblyChildPose=(parentPose:RigidPose,childRelative:RigidPose):RigidPose=>composeRigidPoses(parentPose,childRelative);
