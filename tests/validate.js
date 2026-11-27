"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const order =
  "rules data modules monsters wilds treasure adventures figures view3d ui attack-fx combat overland campaign journal map bestiary navpad watch game".split(
    " ",
  );
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.deepEqual(
  Array.from(html.matchAll(/<script src="([^"]+)"/g), (m) => m[1]),
  order.map((id) => id + ".js"),
);
for (const file of [...order.map((id) => id + ".js"), "style.css"])
  assert(fs.statSync(path.join(root, file)).isFile());
function load() {
  const context = vm.createContext({ assert, console });
  for (const id of order.slice(0, 7))
    vm.runInContext(fs.readFileSync(path.join(root, id + ".js"), "utf8"), context, { filename: id + ".js" });
  return context;
}
const context = load();
vm.runInContext(
  `{
  const unique = rows=>assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
  [Data.items,Data.spells,Monsters.list,Adventures.list].forEach(unique);
  assert.equal(Adventures.list.length,54);
  assert.equal(Adventures.list.filter(a=>a.authored).length,4);
  for(let band=0;band<5;band++){
    const group=Adventures.list.filter(a=>!a.authored&&a.range[0]===1+band*4);
    assert.deepEqual([0,1,2,3].map(size=>group.filter(a=>a.size===size).length),[4,3,2,1]);
  }
  for(const p of Rules.company()){
    assert(Rules.canEquip(p,Data.item(p.weapon)));
    assert(!p.armour||Rules.canEquip(p,Data.item(p.armour)));
    assert(p.hp>0);assert.equal(Rules.saves(p).length,5);
  }
  for(const item of Data.items)if(item.spell)assert(Data.spell(item.spell),item.spell);
  for(const monster of Monsters.list){
    for (const type of [...monster.carriedTreasure, ...monster.lairTreasure]) assert(Treasure.tables[type], monster.name);
    assert(monster.strikeStyle, 'Missing attack style: ' + monster.name);
    if(monster.special.includes('breath')) assert(monster.breathColor,monster.name);
  }
  for(const [id,style] of Object.entries({cellar_rat:'bite',giant_badger:'claw',giant_bat:'bite',giant_wasp:'sting',giant_porcupine:'quill',spitting_cobra:'spit',hill_giant:'stone',outlaw_bowman:'arrow'}))
    assert.equal(Monsters.get(id).strikeStyle,style,id);
  assert.equal(Object.keys(Treasure.tables).length,26);
  const treasureRng=Rules.rng("appraisals");
  for(let lv=1;lv<=20;lv++){
    for(const id of Treasure.shop(lv))assert(Data.item(id));
    for(const t of Object.keys(Treasure.tables))for(let n=0;n<10;n++){
      const hoard=Treasure.roll(t,lv,treasureRng);assert(Number.isInteger(hoard.gold)&&hoard.gold>=0);
      for(const id of hoard.items)assert(Data.item(id));
    }
    for(const c of Rules.classes){
      if(lv>1)assert(Rules.xpFor(c,lv)>Rules.xpFor(c,lv-1));
      assert(Rules.slots({cls:c,level:lv}).every(n=>n>0));
    }
  }
  const cleric = Rules.create("Tester", "Cleric", "Human", 0, 7);
  const expected = ["3321","4321","5321","5421","5521","5531","5532"];
  for (let wis = 12; wis <= 18; wis++) {
    cleric.stats[4] = wis;
    assert.equal(Rules.slots(cleric).join(""), expected[wis - 12]);
  }
  cleric.level = 1;
  Rules.refresh(cleric);
  assert.equal(Rules.slots(cleric).join(""), "3");
  assert.equal(Object.values(cleric.ready).reduce((a,b) => a+b, 0), 3);
  // Validate physical movement separately from the fully revealed dungeon.
  function reachable(l,blocked){
    const queue=[l.start],seen=new Set([l.start.join(",")]);
    for(let i=0;i<queue.length;i++)for(const [dx,dy] of Modules.dirs){
      const [x,y]=[queue[i][0]+dx,queue[i][1]+dy],t=l.grid[y]?.[x],key=x+","+y;
      if(!seen.has(key)&&t&&!blocked(t)){queue.push([x,y]);seen.add(key);}
    }
    return seen;
  }
  let floors=0,sites=0;
  for(const a of Adventures.list){
    const w=Adventures.world(a.id);for(const id of [...a.encounters,a.boss])assert(Monsters.get(id),id);
    const townSeen=reachable(w.town,Modules.blocking);
    assert(townSeen.has(w.town.exit.join(",")));
    for(const [y,row] of w.town.grid.entries())for(let x=0;x<row.length;x++){
      if("ISTHG".includes(row[x]))assert(Modules.dirs.some(([dx,dy])=>townSeen.has([x+dx,y+dy].join(","))),"unreachable service");
      if(!Modules.blocking(row[x]))assert(townSeen.has([x,y].join(",")));
    }
    for(const l of w.levels){
      floors++;const all=Modules.connected(l),open=reachable(l,t=>t==="#"||t==="?");assert(open.has(l.exit.join(",")),a.id+" exit");assert(open.has(l.quest.join(",")));
      assert.equal(Modules.tile(l,...l.start),"<");assert.equal(Modules.tile(l,...l.exit),">");
      for(let y=0;y<l.grid.length;y++){assert.equal(l.grid[y].length,l.grid[0].length);for(let x=0;x<l.grid[y].length;x++)if(l.grid[y][x]!=="#")assert(all.has([x,y].join(",")),l.id+" "+x+","+y);}
      assert(l.doors.length>=1&&l.doors.length<=3);assert(l.traps.length>=2&&l.traps.length<=3);
      for(const p of l.caches)assert(!open.has([p.x,p.y].join(","))&&all.has([p.x,p.y].join(",")),"sealed treasure alcove");
      for(const p of [...l.entities,...l.traps])assert(open.has([p.x,p.y].join(",")));
      for(const e of l.entities)assert(Monsters.get(e.name));
    }
    const wild=reachable(w.wild,t=>!Wilds.speed[t]);for(const v of w.wild.sites){assert(wild.has([v.x,v.y].join(",")));sites++;}
  }
  console.log("Validated "+Adventures.list.length+" adventures, "+floors+" floors, "+sites+" wilderness sites, "+Monsters.list.length+" monsters, "+Data.items.length+" items, "+Data.spells.length+" spells and 5,200 treasure rolls.");
}`,
  context,
);
const signature = "JSON.stringify(Adventures.list.map(a=>Adventures.world(a.id)))";
assert.equal(vm.runInContext(signature, context), vm.runInContext(signature, load()));
console.log("Campaigns reproduced identically on a fresh load.");
