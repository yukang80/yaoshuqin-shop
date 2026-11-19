/* 姚舒琴的小食铺 · 无依赖游戏规则 */
(function (root) {
  'use strict';
  const RECIPES = [
    { id: 'tea', name: '珍珠奶茶', icon: '🧋', price: 16, cost: 2, time: 3.8, color: '#f2c9a5' },
    { id: 'rice', name: '招牌饭团', icon: '🍙', price: 22, cost: 3, time: 5.2, color: '#d3e2c2' },
    { id: 'noodle', name: '暖心拉面', icon: '🍜', price: 32, cost: 5, time: 6.5, color: '#f3b9a6' }
  ];
  const NAMES = ['小林', '阿圆', '小满', '陈叔', '阿桃', '小苏', '乐乐', '周姨'];
  const FACES = ['👩🏻', '🧑🏻', '👧🏻', '👨🏻', '👩🏽', '🧑🏼', '👦🏻', '👩🏻‍🦱'];
  function fresh() { return { version: 1, coins: 80, day: 1, totalServed: 0, totalEarned: 0, best: 0, reputation: 4.5, upgrades: { speed: 0, price: 0, patience: 0, decor: 0 }, noodle: false, sound: false, run: null }; }
  function number(n, fallback, min, max) { return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
  function hydrate(raw) {
    if (!raw || raw.version !== 1) return fresh();
    const s = fresh();
    ['coins','day','totalServed','totalEarned','best'].forEach(k => s[k] = Math.floor(number(raw[k], s[k], k === 'day' ? 1 : 0, 99999999)));
    s.reputation = number(raw.reputation,4.5,1,5);
    Object.keys(s.upgrades).forEach(k => s.upgrades[k] = Math.floor(number(raw.upgrades && raw.upgrades[k],0,0,k==='decor'?3:5)));
    s.noodle = raw.noodle === true; s.sound = raw.sound === true;
    const r = raw.run;
    if (r && r.active && Array.isArray(r.customers) && Array.isArray(r.stations) && r.stations.length === 3 && r.stock && Number.isFinite(r.left)) {
      const valid = r.customers.length <= 3 && r.customers.every(c => Number.isFinite(c.id) && Number.isFinite(c.patience) && Number.isFinite(c.maxPatience) && c.maxPatience > 0 && Array.isArray(c.order) && c.order.length > 0 && c.order.length <= 3 && c.order.every(i => Number.isInteger(i) && i >= 0 && i <= (s.noodle?2:1))) && r.stations.every(x => x === null || (Number.isFinite(x.left) && Number.isFinite(x.total) && x.total > 0));
      if (valid) {
        s.run = { active: true, left: number(r.left,120,0,120), elapsed: number(r.elapsed,0,0,120), revenue: number(r.revenue,0,0,999999), expense: number(r.expense,0,0,999999), served: Math.floor(number(r.served,0,0,999)), missed: Math.floor(number(r.missed,0,0,999)), combo: Math.floor(number(r.combo,0,0,999)), goal: Math.floor(number(r.goal,150,1,999999)), next: number(r.next,5,0,30), id: Math.floor(number(r.id,0,0,999999)), mission: r.mission === true, stock: { tea: Math.floor(number(r.stock.tea,0,0,5)), rice: Math.floor(number(r.stock.rice,0,0,5)), noodle: Math.floor(number(r.stock.noodle,0,0,5)) }, stations:r.stations.map(x=>x?{left:number(x.left,0,0,20),total:number(x.total,1,0.1,20)}:null), customers:r.customers.map(c=>({id:c.id,name:NAMES.includes(c.name)?c.name:NAMES[0],face:FACES.includes(c.face)?c.face:FACES[0],order:c.order.slice(),patience:number(c.patience,10,0,90),maxPatience:number(c.maxPatience,30,1,90)})) };
      }
    }
    return s;
  }
  class Game {
    constructor(state, random) { this.state = hydrate(state || fresh()); this.random = random || Math.random; }
    get run() { return this.state.run; }
    price(i) { return RECIPES[i].price + this.state.upgrades.price * 3; }
    duration(i) { return RECIPES[i].time * Math.pow(0.84,this.state.upgrades.speed); }
    start() {
      if (this.run && this.run.active) return false;
      this.state.run = { active:true,left:120,elapsed:0,revenue:0,expense:0,served:0,missed:0,combo:0,goal:150+(this.state.day-1)*45,next:6,id:0,mission:false,stock:{tea:0,rice:0,noodle:0},stations:[null,null,null],customers:[] };
      this.spawn(); this.spawn(); return true;
    }
    spawn() {
      const r=this.run; if (!r || !r.active || r.customers.length>=3 || r.left<7) return;
      const n=Math.floor(this.random()*NAMES.length); const count=this.state.noodle?3:2;
      const patience=Math.max(22,40-this.state.day)+this.state.upgrades.patience*6;
      const order=[Math.floor(this.random()*count)];
      if (this.state.day>1 && this.random()<Math.min(0.4,this.state.day*0.08)) order.push(Math.floor(this.random()*count));
      r.customers.push({id:++r.id,name:NAMES[n],face:FACES[n],order,patience,maxPatience:patience});
    }
    cook(i) {
      const r=this.run, recipe=RECIPES[i];
      if (!r || !r.active || !recipe) return {ok:false,message:'先点击开始营业吧'};
      if (i===2&&!this.state.noodle) return {ok:false,message:'到升级商店解锁暖心拉面'};
      if (r.stations[i]) return {ok:false,message:'正在制作，请稍等一下'};
      if (r.stock[recipe.id]>=5) return {ok:false,message:'备餐已满，先给客人上餐吧'};
      if (this.state.coins<recipe.cost) return {ok:false,message:'金币不足，可以领取应急食材金'};
      this.state.coins-=recipe.cost; r.expense+=recipe.cost;
      r.stations[i]={left:this.duration(i),total:this.duration(i)}; return {ok:true};
    }
    canServe(c) { const needs={}; c.order.forEach(i=>needs[RECIPES[i].id]=(needs[RECIPES[i].id]||0)+1); return Object.keys(needs).every(k=>this.run.stock[k]>=needs[k]); }
    serve(id) {
      const r=this.run; if (!r||!r.active) return {ok:false};
      const c=r.customers.find(x=>x.id===id); if (!c) return {ok:false};
      if (!this.canServe(c)) return {ok:false,message:'先做好这位客人需要的餐品'};
      c.order.forEach(i=>r.stock[RECIPES[i].id]--);
      const base=c.order.reduce((n,i)=>n+this.price(i),0);
      r.combo++; const tip=Math.round(base*(c.patience/c.maxPatience)*0.2)+Math.min(5,r.combo-1)+this.state.upgrades.decor*2;
      const earned=base+tip;
      r.revenue+=earned; r.served++; this.state.coins+=earned; this.state.totalEarned+=earned; this.state.totalServed++;
      this.state.reputation=Math.min(5,this.state.reputation+0.04);
      r.customers=r.customers.filter(x=>x.id!==id); r.next=Math.min(r.next,2.5);
      let bonus=0; if (r.served>=5&&!r.mission) {r.mission=true;bonus=35;this.state.coins+=bonus;}
      return {ok:true,earned,tip,bonus,combo:r.combo};
    }
    tick(dt) {
      const r=this.run, events=[]; if (!r||!r.active||!Number.isFinite(dt)||dt<=0) return events;
      const step=Math.min(dt,r.left); r.left=Math.max(0,r.left-step);r.elapsed+=step;
      r.stations.forEach((job,i)=>{if(job){job.left-=step;if(job.left<=0){r.stock[RECIPES[i].id]++;r.stations[i]=null;events.push({type:'ready',i});}}});
      r.customers.forEach(c=>c.patience-=step);
      const departed=r.customers.filter(c=>c.patience<=0); if(departed.length){r.missed+=departed.length;r.combo=0;this.state.reputation=Math.max(1,this.state.reputation-0.12*departed.length);r.customers=r.customers.filter(c=>c.patience>0);events.push({type:'missed',count:departed.length});}
      r.next-=step;if(r.next<=0){this.spawn();r.next=Math.max(4,7-this.state.day*0.2);}
      if(r.left<=0){events.push({type:'end',summary:this.finish()});} return events;
    }
    finish() {
      const r=this.run;if(!r||!r.active)return null;
      r.active=false;const bonus=r.revenue>=r.goal?60:0;this.state.coins+=bonus;
      this.state.best=Math.max(this.state.best,r.revenue);
      const summary={day:this.state.day,revenue:r.revenue,expense:r.expense,served:r.served,missed:r.missed,goal:r.goal,bonus,mission:r.mission?35:0,profit:r.revenue-r.expense+bonus+(r.mission?35:0)};
      this.state.day++;return summary;
    }
    upgradeInfo(type) {
      const defs={speed:{name:'高效设备',desc:'每级制作时间减少 16%',base:120,max:5},price:{name:'独家配方',desc:'每级所有餐品售价 +3',base:100,max:5},patience:{name:'舒适座椅',desc:'每级客人多等 6 秒',base:90,max:5},decor:{name:'温馨装饰',desc:'每级每单小费 +2',base:150,max:3}};
      if(type==='noodle')return {name:'暖心拉面',desc:'解锁新菜单，基础售价 32 金币',cost:160,level:this.state.noodle?1:0,max:1};
      const def=defs[type];if(!def)return null;const level=this.state.upgrades[type];return {...def,level,cost:Math.round(def.base*Math.pow(1.65,level))};
    }
    upgrade(type) {const u=this.upgradeInfo(type);if(!u||u.level>=u.max)return {ok:false,message:'已经升到最高级啦'};if(this.state.coins<u.cost)return {ok:false,message:'金币还不够，再接几单吧'};this.state.coins-=u.cost;if(type==='noodle')this.state.noodle=true;else this.state.upgrades[type]++;return {ok:true,message:u.name+'升级成功'};}
    rescue() {if(this.state.coins>=5)return false;this.state.coins+=15;return true;}
  }
  root.ShopGame={Game,fresh,hydrate,RECIPES};
})(typeof globalThis!=='undefined'?globalThis:this);
