/* ---------- 导航与骨架 ---------- */
var TABS = [
  ['surveyors','📋 调查员'], ['npcs','👤 NPC 与敌人'], ['maps','🗺️ 地图·路线'],
  ['combat','⚔️ 战斗']
];





/* ================= 调查员 / NPC 库 ================= */
var pendingFile = null, pendingParse = null, currentActorModal = null, editingActorId = null;
/* NPC 模板表在 10-npc-gen.js（这里原来那份是被覆盖的死数据，已删） */


function randBetween(min,max){ return Math.round(min + Math.random()*(max-min)); }


/* ---------- 导入 ---------- */




