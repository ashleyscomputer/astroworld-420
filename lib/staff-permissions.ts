export const roles=['super_admin','manager','sales','reception'] as const;
export type Role=typeof roles[number];export type Permission='dashboard'|'inventory'|'create_order'|'update_order'|'members'|'scan'|'manage_members'|'manage_staff';
const grants:Record<Role,readonly Permission[]>={super_admin:['dashboard','inventory','create_order','update_order','members','scan','manage_members','manage_staff'],manager:['dashboard','inventory','create_order','update_order','members','scan'],sales:['dashboard','create_order','update_order','members'],reception:['scan']};
export const isRole=(r:unknown):r is Role=>typeof r==='string'&&roles.some(x=>x===r);
export const allowed=(r:Role,p:Permission)=>grants[r].includes(p);