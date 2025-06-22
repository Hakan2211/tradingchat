-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_PermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_action_entity_access_key" ON "Permission"("action", "entity", "access");

-- CreateIndex
CREATE UNIQUE INDEX "_PermissionToRole_AB_unique" ON "_PermissionToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_PermissionToRole_B_index" ON "_PermissionToRole"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RoleToUser_AB_unique" ON "_RoleToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser"("B");


--Manual Migration---
INSERT INTO Permission VALUES('cmc65vqf10000ucsckw2o91gk','create','user','own','',1750505673853,1750505673853);
INSERT INTO Permission VALUES('cmc65vqfn0001ucscuge7d8zf','create','user','any','',1750505673875,1750505673875);
INSERT INTO Permission VALUES('cmc65vqg00002ucsckg5u9btg','read','user','own','',1750505673888,1750505673888);
INSERT INTO Permission VALUES('cmc65vqga0003ucscyybgtwpb','read','user','any','',1750505673899,1750505673899);
INSERT INTO Permission VALUES('cmc65vqgm0004ucsci3o9obxx','update','user','own','',1750505673911,1750505673911);
INSERT INTO Permission VALUES('cmc65vqgy0005ucsc43n7endd','update','user','any','',1750505673923,1750505673923);
INSERT INTO Permission VALUES('cmc65vqhb0006ucscbnz4volm','delete','user','own','',1750505673935,1750505673935);
INSERT INTO Permission VALUES('cmc65vqhn0007ucscrlsewjvl','delete','user','any','',1750505673947,1750505673947);
INSERT INTO Permission VALUES('cmc65vqhy0008ucsciqaxnly4','create','note','own','',1750505673959,1750505673959);
INSERT INTO Permission VALUES('cmc65vqil0009ucscajdknpgs','create','note','any','',1750505673981,1750505673981);
INSERT INTO Permission VALUES('cmc65vqj4000aucsch4fc4upp','read','note','own','',1750505674001,1750505674001);
INSERT INTO Permission VALUES('cmc65vqjj000bucscxry54aci','read','note','any','',1750505674015,1750505674015);
INSERT INTO Permission VALUES('cmc65vqju000cucscwznsxmft','update','note','own','',1750505674026,1750505674026);
INSERT INTO Permission VALUES('cmc65vqk7000ducsczh7oaeqo','update','note','any','',1750505674039,1750505674039);
INSERT INTO Permission VALUES('cmc65vqkh000eucsc5vs5s0ea','delete','note','own','',1750505674050,1750505674050);
INSERT INTO Permission VALUES('cmc65vqku000fucscwanmr4ew','delete','note','any','',1750505674063,1750505674063);

INSERT INTO Role VALUES('cmc65vql6000gucsct99jy01k','admin','',1750505674074,1750505674074);
INSERT INTO Role VALUES('cmc65vqli000hucscpgw8n8kf','user','',1750505674086,1750505674086);

INSERT INTO _PermissionToRole VALUES('cmc65vqfn0001ucscuge7d8zf','cmc65vql6000gucsct99jy01k');
INSERT INTO _PermissionToRole VALUES('cmc65vqga0003ucscyybgtwpb','cmc65vql6000gucsct99jy01k');
INSERT INTO _PermissionToRole VALUES('cmc65vqgy0005ucsc43n7endd','cmc65vql6000gucsct99jy01k');
INSERT INTO _PermissionToRole VALUES('cmc65vqhn0007ucscrlsewjvl','cmc65vql6000gucsct99jy01k');
INSERT INTO _PermissionToRole VALUES('cmc65vqil0009ucscajdknpgs','cmc65vql6000gucsct99jy01k');
INSERT INTO _PermissionToRole VALUES('cmc65vqjj000bucscxry54aci','cmc65vql6000gucsct99jy01k');
INSERT INTO _PermissionToRole VALUES('cmc65vqk7000ducsczh7oaeqo','cmc65vql6000gucsct99jy01k');
INSERT INTO _PermissionToRole VALUES('cmc65vqku000fucscwanmr4ew','cmc65vql6000gucsct99jy01k');
INSERT INTO _PermissionToRole VALUES('cmc65vqf10000ucsckw2o91gk','cmc65vqli000hucscpgw8n8kf');
INSERT INTO _PermissionToRole VALUES('cmc65vqg00002ucsckg5u9btg','cmc65vqli000hucscpgw8n8kf');
INSERT INTO _PermissionToRole VALUES('cmc65vqgm0004ucsci3o9obxx','cmc65vqli000hucscpgw8n8kf');
INSERT INTO _PermissionToRole VALUES('cmc65vqhb0006ucscbnz4volm','cmc65vqli000hucscpgw8n8kf');
INSERT INTO _PermissionToRole VALUES('cmc65vqhy0008ucsciqaxnly4','cmc65vqli000hucscpgw8n8kf');
INSERT INTO _PermissionToRole VALUES('cmc65vqj4000aucsch4fc4upp','cmc65vqli000hucscpgw8n8kf');
INSERT INTO _PermissionToRole VALUES('cmc65vqju000cucscwznsxmft','cmc65vqli000hucscpgw8n8kf');
INSERT INTO _PermissionToRole VALUES('cmc65vqkh000eucsc5vs5s0ea','cmc65vqli000hucscpgw8n8kf');

