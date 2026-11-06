'use strict';
(() => {
  const W=WS,$=id=>document.getElementById(id),s=W.state;
  let toastTimer,hintTimer,objectURL;
  const icon=paths=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  W.toast=message=>{$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200);};
  const title=t=>t.charAt(0).toUpperCase()+t.slice(1);
  W.syncUI=()=>{
    for(const key of ['region','time','weather','speed'])document.querySelectorAll(`[data-${key}]`).forEach(b=>b.setAttribute('aria-pressed',b.dataset[key]===s[key]));
    $('opening').value=s.opening;$('opening-value').textContent=Math.round(s.opening)+'%';$('volume').value=s.volume;
    $('sound-toggle').textContent=s.sound?'Sound on':'Sound off';$('sound-toggle').setAttribute('aria-pressed',s.sound);
    $('quick-sound').setAttribute('aria-label',s.sound?'Mute sound':'Enable sound');$('quick-sound').title=s.sound?'Mute sound':'Enable sound';$('quick-sound').querySelector('.off-mark').hidden=s.sound;
    $('quick-pause').innerHTML=icon(s.speed==='paused'?'<path d="m8 5 10 7-10 7z"/>':'<path d="M9 5v14M15 5v14"/>');$('quick-pause').setAttribute('aria-label',s.speed==='paused'?'Resume scenery':'Pause scenery');$('quick-pause').title=s.speed==='paused'?'Resume scenery':'Pause scenery';
    $('journey-caption').textContent=`${title(s.region)} · ${title(s.time)}`;
    const notes={riverlands:'Along the river',highlands:'Among the hills',coast:'Beside the sea'};
    $('place-note').textContent=notes[s.region]+(s.speed==='paused'?' · taking a moment':'');
    $('scene').setAttribute('aria-label',`${title(s.region)} in ${s.time}, ${s.weather==='rain'?'rain on the window':'clear weather'}. Scenery ${s.speed==='paused'?'paused':'moving'}.`);
  };
  W.bindUI=(renderer,audio)=>{
    const panel=$('journey-panel'),toggle=$('journey-toggle');
    const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');};
    toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',!panel.hidden);});
    $('close-panel').addEventListener('click',()=>{close();toggle.focus();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();toggle.focus();}});
    document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!toggle.contains(e.target))close();});
    for(const key of ['region','time','weather','speed'])document.querySelectorAll(`[data-${key}]`).forEach(button=>button.addEventListener('click',()=>{
      const value=button.dataset[key];
      if(key==='region') {if(value!==s.region){W.selectRegion(value);W.toast(`Drifting toward the ${value}…`);}}
      else {s[key]=value;W.persist();W.syncUI();if(key==='weather'&&value==='rain')W.toast('Trace a little clearing on the glass.');}
      audio.update(s);
    }));
    $('opening').addEventListener('input',e=>{s.opening=+e.target.value;W.syncUI();audio.update(s);W.persist();});
    $('volume').addEventListener('input',e=>{s.volume=+e.target.value;audio.update(s);W.persist();});
    let audioPending=false;
    const sound=async()=>{
      if(audioPending)return;
      if(s.sound){s.sound=false;audio.on=false;audio.update(s);W.syncUI();return;}
      audioPending=true;const ok=await audio.enable();audioPending=false;
      s.sound=ok;audio.update(s);W.syncUI();if(!ok)W.toast('Sound is unavailable here. The view is yours to enjoy.');
    };
    $('sound-toggle').addEventListener('click',sound);$('quick-sound').addEventListener('click',sound);
    let previousSpeed='cruise';
    $('quick-pause').addEventListener('click',()=>{if(s.speed==='paused')s.speed=previousSpeed;else{previousSpeed=s.speed;s.speed='paused';}W.persist();W.syncUI();audio.update(s);});
    $('coffee').addEventListener('click',()=>{if(s.coffee<=0){s.coffee=1.8;W.toast('A little warmth for the journey.');}});
    let wiping=false,lastPoint=null;
    const inWindow=(x,y)=>{const r=renderer.win;return x>=r.x&&x<=r.x+r.w&&y>=r.y+r.h*s.opening/100*.7&&y<=r.y+r.h;};
    const wipe=e=>{
      if(!wiping)return;const x=e.clientX,y=e.clientY;
      if(lastPoint){const n=Math.min(12,Math.ceil(Math.hypot(x-lastPoint.x,y-lastPoint.y)/12));for(let i=1;i<=n;i++){const xx=lastPoint.x+(x-lastPoint.x)*i/n,yy=lastPoint.y+(y-lastPoint.y)*i/n;if(inWindow(xx,yy))renderer.wipe(xx,yy);}}
      else if(inWindow(x,y))renderer.wipe(x,y);
      lastPoint={x,y};
    };
    renderer.canvas.addEventListener('pointerdown',e=>{if(!s.started||s.weather!=='rain'||!inWindow(e.clientX,e.clientY))return;e.preventDefault();wiping=true;lastPoint=null;renderer.canvas.setPointerCapture(e.pointerId);wipe(e);});
    renderer.canvas.addEventListener('pointermove',wipe);
    for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.canvas.addEventListener(event,()=>{wiping=false;lastPoint=null;});
    const saveDialog=$('save-dialog'),saveButton=$('save-view');
    const saveText=saveButton.querySelector('span:last-child');
    const saveReady=()=>{saveButton.disabled=false;saveButton.removeAttribute('aria-busy');saveText.textContent='Save the view';};
    const closeSave=()=>{saveDialog.close();if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}};
    $('close-save').addEventListener('click',closeSave);
    saveDialog.addEventListener('cancel',()=>{if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}});
    $('save-view').addEventListener('click',()=>{
      if(saveButton.disabled)return;saveButton.disabled=true;saveButton.setAttribute('aria-busy','true');saveText.textContent='Capturing…';
      try {
        renderer.render(s,0);
        renderer.canvas.toBlob(blob=>{
          saveReady();
          if(!blob){W.toast('This browser could not create an image. Try a screenshot.');return;}
          if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(blob);
          $('saved-image').src=objectURL;$('download-image').href=objectURL;
          saveDialog.showModal();
          // Preview stays available even if a mobile host ignores the download attribute.
          if('download' in HTMLAnchorElement.prototype){$('download-image').click();}
        },'image/png');
      }catch(_){saveReady();W.toast('Image saving is unavailable here. You can take a screenshot.');}
    });
    const takeSeat=()=>{
      $('welcome').close();s.started=true;W.resetFrame();
      $('hint').textContent=W.reduced?'The view is still. Choose a pace in Journey whenever you like.':'Settle in. There’s nowhere else you need to be.';
      $('hint').classList.add('visible');clearTimeout(hintTimer);hintTimer=setTimeout(()=>$('hint').classList.remove('visible'),6500);
      toggle.focus({preventScroll:true});
    };
    $('begin').addEventListener('click',takeSeat);
    $('welcome').addEventListener('cancel',e=>{e.preventDefault();takeSeat();});
    $('quick-sound').innerHTML=icon('<path d="M11 5 6 9H3v6h3l5 4zM15 8q5 4 0 8"/>')+'<span class="off-mark">/</span>';
    $('save-view').querySelector('span').innerHTML=icon('<rect x="3" y="5" width="18" height="15" rx="3"/><path d="m3 16 5-5 5 5 3-3 5 5"/><circle cx="16" cy="9" r="1"/>');
    W.syncUI();$('welcome').showModal();
  };
})();
