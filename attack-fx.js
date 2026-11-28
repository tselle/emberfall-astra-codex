"use strict";
// Screen-space choreography. Rendering is deterministic and never rolls combat dice.
const AttackFX = (() => {
  const tau = Math.PI * 2, clamp = n => Math.max(0, Math.min(1, n));
  function style(sp) {
    const id = sp?.id || "breath";
    if (/lightning|tempest/.test(id)) return "storm";
    if (/breath|fire|cinder|ashen|flame/.test(id)) return "fire";
    if (/rime|frost|glass|ice/.test(id)) return "ice";
    if (id === "stinking_cloud") return "cloud";
    if (["heal", "cure"].includes(sp?.effect)) return "heal";
    return sp?.effect || "damage";
  }
  const colors = {storm:"#a3dfff", fire:"#ff9747", ice:"#a2efff", cloud:"#a9ca78", heal:"#8cf2ae", buff:"#ffdc78", drain:"#dd87d9", disable:"#bb9eff", debuff:"#b491ce"};
  function draw(g, e, p, source, target) {
    const [sx, sy0] = source, sy = sy0 - 18;
    const tx = target[0] + (e.hit ? 0 : 16), ty = target[1] - 17;
    const dx = tx-sx, dy = ty-sy, angle = Math.atan2(dy,dx);
    const theme = style(e.sp), color = e.color || (e.kind === "spell" ? colors[theme] || "#abdcff" : "#ffd590");
    const flight = clamp((p-.26)/.42), impact = clamp((p-.68)/.32);
    const line = (points, ink, width) => {
      g.strokeStyle = ink; g.lineWidth = width; g.beginPath(); g.moveTo(...points[0]);
      for (const point of points.slice(1)) g.lineTo(...point);
      g.stroke();
    };
    const ring = (x,y,r,ink,start=0,end=tau) => {
      g.strokeStyle=ink; g.lineWidth=1.5; g.beginPath(); g.arc(x,y,r,start,end); g.stroke();
    };
    const mote = (x,y,r,ink) => {
      g.fillStyle=ink; g.beginPath(); g.arc(x,y,r,0,tau); g.fill();
    };
    g.save(); g.lineCap="round"; g.lineJoin="round";
    if (e.kind === "breath" && p < .84) {
      // A widening stream originates at the creature rather than a caster's hand.
      const reach=Math.hypot(dx,dy), t=clamp((p-.16)/.5);
      g.translate(sx,sy); g.rotate(angle);
      if(p<.2) ring(0,0,2+4*Math.sin(Math.PI*p/.2),color);
      g.globalAlpha=clamp((.84-p)/.16);
      for(let i=0;i<24 && t>0;i++) {
        const along=t*((i/24+p*2)%1), spread=along*15;
        const y=Math.sin(i*12.7+p*8)*spread, x=along*reach;
        line([[x-2,y],[x+2+along*5,y+Math.sin(i)*along*2]],i%4?color:"#f4eee3",2+along*3);
      }
      // Impact is drawn in battlefield coordinates below.
      g.rotate(-angle); g.translate(-sx,-sy);
    } else if (e.kind === "melee" && e.style && e.style !== "weapon" && p < .84) {
      const contact=clamp((p-.32)/.36), fade=clamp((.84-p)/.14);
      g.save(); g.translate(tx,ty); g.rotate(angle); g.globalAlpha=contact*fade;
      const x=-14+contact*12;
      switch(e.style) {
        case "bite": { // Opposing rows of teeth converge, never a held blade.
          const gap=2+7*(1-contact);
          for(let j=-6;j<=4;j+=5) for(const sign of [-1,1])
            line([[x+j,sign*(gap+3)],[x+j+2,sign*gap],[x+j+3,sign*(gap+3)]],"#f3debb",2);
          break;
        }
        case "claw":
          for(let j=-5;j<=5;j+=5) line([[x-7,j-5],[x,j-2],[x+5,j+3]],"#efcfac",2);
          break;
        case "coil":
          for(let j=-5;j<=5;j+=5) ring(j,0,9-contact*4,"#caa785",p*4,p*4+5.5);
          break;
        case "sting": case "peck":
          line([[x-9,-3],[x+5,0],[x-9,3]],e.style==="sting"?"#cc975b":"#e5bd80",2); break;
        case "touch":
          for(let j=0;j<4;j++) ring(x+j*2,0,2+j*2,"#b8acdc",p*7+j,p*7+j+3); break;
        case "kick": case "ram": case "slam":
          for(let j=0;j<3;j++) ring(x-j*4,0,4+j*3,"#d1bda5",-.9,.9);
          break;
      }
      g.restore();
    } else if (e.kind === "melee" && p < .79) {
      // Draw the weapon in the attacker's hand, trailing the cutting edge through the swing.
      const reach = .55 * meleePose(p), handX=sx+dx*reach, handY=sy+dy*reach;
      const mirror = dx < 0 ? -1 : 1, swing=angle+mirror*(-1.5+2*flight);
      g.save(); g.translate(handX,handY); g.rotate(swing);
      if (flight > 0) {
        for (let i=0;i<3;i++) ring(0,0,18+i*2,i===2?"#ffe8b0":"#aa987a",mirror>0?-.85*flight:0,mirror>0?0:.85*flight);
      }
      line([[-4,0],[4,0]],"#916749",3); line([[3,-4],[3,4]],"#dbac68",2);
      line([[4,0],[20,0],[24,-1]],"#dce5e7",3); g.restore();
    } else if (e.kind === "missile" && p <= .68) {
      g.save(); g.translate(sx,sy); g.rotate(angle);
      if (e.style === "arrow" || /bow/i.test(e.weapon || "")) {
        line([[-2,-10],[3,-6],[5,0],[3,6],[-2,10]],"#cc9a63",2);
        line([[-2,-10],[-2-7*(flight ? 0 : clamp(p/.26)),0],[-2,10]],"#d8cdbc",1);
      }
      g.restore();
      const lift = e.style === "stone" || /sling|javelin/i.test(e.weapon || "") ? 19 : e.style === "ray" ? 0 : 6;
      const pos = t => [sx+dx*t,sy+dy*t-lift*Math.sin(Math.PI*t)];
      const head=pos(flight); line([pos(Math.max(0,flight-.19)),head],"rgba(255,225,166,.4)",2);
      g.save(); g.translate(...head); g.rotate(Math.atan2(dy-lift*Math.PI*Math.cos(Math.PI*flight),dx));
      if (e.style === "spit") { ring(0,0,3,"#b7dd73"); line([[-6,0],[-11,1]],"#98af63",2); }
      else if (e.style === "quill") { for(let j=-1;j<=1;j++) line([[-9,j*4],[0,j*3]],"#e6d6b1",1.5); }
      else if (e.style === "ray") line([[-flight*Math.hypot(dx,dy),0],[0,0]],"#ceafff",3);
      else if (e.style === "stone" || /sling/i.test(e.weapon || "")) mote(0,0,2.4,"#c9bbb1");
      else { line([[-14,0],[0,0]],"#cda87b",2); line([[-4,-2],[1,0],[-4,2]],"#e7e2d3",2); line([[-14,-3],[-10,0],[-14,3]],"#dfcbab",1.5); }
      g.restore();
    } else if (e.kind === "spell" && p < .68) {
      const charge=clamp(p/.26); g.globalAlpha=1-flight*.75;
      ring(sx,sy,4+8*charge,color,p*8,p*8+5);
      for(let i=0;i<6;i++) {const a=i*tau/6+p*6,r=17-7*charge; mote(sx+r*Math.cos(a),sy+r*Math.sin(a),1.6,color);}
      g.globalAlpha=1;
      if(flight>0) {
        if(theme==="storm") {
          const points=[[sx,sy]];
          for(let i=1;i<=12;i++) {const t=i*flight/12; points.push([sx+dx*t,sy+dy*t+Math.sin(i*17+p*23)*6*Math.sin(i*Math.PI/12)]);}
          line(points,color,4); line(points,"#fff",1);
        } else {
          for(let i=7;i>=0;i--) {const t=Math.max(0,flight-i*.025); g.globalAlpha=1-i/9;
            mote(sx+dx*t,sy+dy*t-7*Math.sin(t*Math.PI),4-i*.35,i?color:"#fff");}
        }
      }
    }
    if(impact>0) {
      g.globalAlpha=1-impact;
      const magic=e.kind==="spell", size=magic?18+Math.min(3,e.sp?.radius||0)*10:15;
      if(e.hit) {
        if(magic) ring(tx,ty,3+size*impact,color);
        for(let i=0;i<(magic?16:8);i++) {
          const a=i*tau/(magic?16:8), r=(4+size*impact)*(i%2?.78:1.2);
          const x=tx+Math.cos(a)*r,y=ty+Math.sin(a)*r+(magic?-5:7)*impact*impact;
          if(magic && theme==="heal") {line([[x-2,y],[x+2,y]],color,1.6);line([[x,y-2],[x,y+2]],color,1.6);}
          else if(magic && theme==="cloud") ring(x,y,2+impact*5,color);
          else line([[x,y],[x+5*Math.cos(a),y+5*Math.sin(a)]],i%3?color:"#fff4d5",i%2?2:1);
        }
      } else {line([[tx-6,ty+6],[tx+7,ty-5]],"#ccc9bc",2); g.fillStyle="#e0dcca"; g.fillText("Miss",tx,ty-9-impact*7);}
    }
    g.restore();
  }
  function meleePose(p) {
    if(p<.26) return -.18*Math.sin(p/.26*Math.PI/2);
    if(p<.68) return -.18+1.18*clamp((p-.26)/.42)**1.6;
    return 1-clamp((p-.68)/.32);
  }
  return { draw, meleePose };
})();
