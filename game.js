const config={type:Phaser.AUTO,width:800,height:600,backgroundColor:'#111',parent:'game-root',scene:{create}};
new Phaser.Game(config);
function create(){
	const labels=['level','boss','shop'];
	const startY=220;
	const gap=110;
	window._chipLoop&&window._chipLoop.stop&&window._chipLoop.stop();
	for(let i=0;i<labels.length;i++){
		const btn=this.add.text(400,startY+i*gap,labels[i],{
			fontSize:48,color:'#fff',
		}).setOrigin(0.5).setInteractive({useHandCursor:true});
		btn.on('pointerdown',()=>{
			window._chipLoop&&window._chipLoop.stop&&window._chipLoop.stop();
			const ctx=window._audioCtx||(window._audioCtx=new(window.AudioContext||window.webkitAudioContext)());
			if(ctx.state==='suspended')ctx.resume();
			let running=true;
			function stop(){running=false;}
			window._chipLoop={stop};

			// ── helpers ──────────────────────────────────────────────
			function pl(type,freq,gain,atk,sus,rel){
				if(!freq)return;
				const o=ctx.createOscillator(),g=ctx.createGain();
				o.type=type;o.frequency.value=freq;
				const t=ctx.currentTime;
				g.gain.setValueAtTime(0,t);
				g.gain.linearRampToValueAtTime(gain,t+atk);
				g.gain.setValueAtTime(gain*.78,t+atk+sus);
				g.gain.linearRampToValueAtTime(0,t+atk+sus+rel);
				o.connect(g);g.connect(ctx.destination);
				o.start(t);o.stop(t+atk+sus+rel+.01);
				o.onended=()=>{try{o.disconnect();g.disconnect();}catch(_){}};
			}
			function kick(v){
				const o=ctx.createOscillator(),g=ctx.createGain();
				const t=ctx.currentTime;
				o.type='sine';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(26,t+.09);
				g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.09);
				o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.1);
				o.onended=()=>{try{o.disconnect();g.disconnect();}catch(_){}};
			}
			function snare(v){
				const len=Math.ceil(ctx.sampleRate*.13),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
				for(let j=0;j<len;j++)d[j]=Math.random()*2-1;
				const src=ctx.createBufferSource();src.buffer=buf;
				const flt=ctx.createBiquadFilter();flt.type='bandpass';flt.frequency.value=2500;flt.Q.value=.9;
				const g=ctx.createGain();const t=ctx.currentTime;
				g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.13);
				src.connect(flt);flt.connect(g);g.connect(ctx.destination);src.start(t);src.stop(t+.14);
				src.onended=()=>{try{src.disconnect();flt.disconnect();g.disconnect();}catch(_){}};
			}
			function hihat(v,dur){
				const len=Math.ceil(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
				for(let j=0;j<len;j++)d[j]=Math.random()*2-1;
				const src=ctx.createBufferSource();src.buffer=buf;
				const flt=ctx.createBiquadFilter();flt.type='highpass';flt.frequency.value=7800;
				const g=ctx.createGain();const t=ctx.currentTime;
				g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
				src.connect(flt);flt.connect(g);g.connect(ctx.destination);src.start(t);src.stop(t+dur+.01);
				src.onended=()=>{try{src.disconnect();flt.disconnect();g.disconnect();}catch(_){}};
			}

			// ════════════════════════════════════════════════════════
			if(i===0){
			// ── LEVEL · WILY FORTRESS ────────────────────────────
			// Re menor · 150 BPM · semicorchea = 100ms
			// Canal 1 (square)   : melodía principal – frase desc/asc + C# armónico
			// Canal 2 (sawtooth) : contra-melodía en 3ª inferior
			// Canal 3 (triangle) : bajo caminante D3-C3-Bb2-A2-G2-F2
			// Canal 4 (ruido)    : batería kick/snare/hihat
			let t=0;
			// Melodía: D5 C5 Bb4 A4 | G4 F4 E4 F4 | G4 A4 Bb4 C5 | D5 D5 C5 Bb4
			//          A4 A4 C#5 C5 | Bb4 A4 G4 F4 | E4 F4 G4 A4 | Bb4 C5 D5 D5
      // 🎵 Melodía (más rítmica + hook claro)
      const mel=[
        587,0,587,523, 466,0,440,0,
        392,440,466,0, 523,0,587,0,

        698,0,698,587, 523,0,466,0,
        440,466,523,0, 554,0,587,0
      ];

      // 🎶 Contra-melodía (responde, no copia)
      const ctr=[
        293,349,392,349,
        293,262,220,262
      ];

      // 🎸 Bajo (define acordes reales)
      const bss=[
        147,147,147,147,   // D
        116,116,116,116,   // Bb
        174,174,174,174,   // F
        110,110,110,110    // A (dominante fuerte)
      ];
			function loop(){
				if(!running)return;
				const s=t%32;
				// Canal 1: lead square
				pl('square',mel[s],.15,.004,.072,.023);
				// Canal 2: contra-melodía sawtooth (cada 4 pasos)
				if(s%4===0){pl('sawtooth',ctr[(s/4)%8],.065,.008,.14,.04);}
				// Canal 3: bajo triángulo (cada 4 pasos)
				if(s%4===0){pl('triangle',bss[(s/4)%8],.14,.005,.26,.06);}
				// Canal 4: batería
				const d=t%16;
				if(d===0||d===8)kick(.26);
				if(d===4||d===12)snare(.14);
				if(t%2===0)hihat(.04,.048);
				t++;setTimeout(loop,100);
			}loop();

			// ════════════════════════════════════════════════════════
			}else if(i===1){
			// ── BOSS · BOSS BATTLE ───────────────────────────────
			// La menor + cromatismos (Ab4=415, Eb4=311) · 168 BPM · 89ms
			// Canal 1 (square)   : melodía agresiva con tensión cromática
			// Canal 2 (sawtooth) : bajo pulsante en corcheas
			// Canal 4 (ruido)    : bombo doble + caja sincopada + hihat constante
			let t=0;
			// A4 A4 C5 Bb4 | A4 Ab4 A4 G4 | G4 Ab4 A4 B4 | C5 Bb4 A4 Ab4
			// A4 C5 E5 D5  | C5 B4 Bb4 A4 | Ab4 A4 G4 F4 | E4 Eb4 E4 F4
			const mel=[440,440,523,466,440,415,440,392,392,415,440,493,523,466,440,415,
			           440,523,659,587,523,493,466,440,415,440,392,349,330,311,330,349];
			// Bajo A menor: A3 A3 E3 E3 G3 G3 D3 D3 A3 A3 F3 F3 E3 E3 D3 G3
			const bss=[220,220,165,165,196,196,147,147,220,220,175,175,165,165,147,196];
			function loop(){
				if(!running)return;
				const s=t%32;
				pl('square',mel[s],.17,.003,.06,.022);
				if(s%2===0)pl('sawtooth',bss[(s/2)%16],.11,.004,.12,.03);
				// Batería agresiva patrón-8
				const d=t%8;
				if(d===0)kick(.32);
				if(d===4){kick(.22);snare(.16);}
				if(d===2||d===6)snare(.12);
				hihat(.07,.034);
				t++;setTimeout(loop,89);
			}loop();

			// ════════════════════════════════════════════════════════
			}else{
			// ── SHOP · NEW WEAPON ────────────────────────────────
			// Sol mayor · 120 BPM · semicorchea = 125ms
			// Canal 1 (triangle) : fanfare ascendente G4→A5
			// Canal 2 (square)   : arpegios chispeantes en off-beats
			// Canal 3 (triangle) : acordes I-IV-V-IV (G-C-D-C)
			// Canal 4 (triangle) : bajo Sol mayor
			let t=0;
			// G4 G4 A4 B4 | C5 D5 E5 G5 | G5 E5 D5 C5 | B4 A4 G4 B4
			// D5 E5 G5 A5 | G5 E5 D5 C5 | B4 D5 E5 G5 | E5 D5 B4 G4
			const mel=[392,392,440,493,523,587,659,784,784,659,587,523,493,440,392,493,
			           587,659,784,880,784,659,587,523,493,587,659,784,659,587,493,392];
			// Acordes: G B D | C E G | D F# A | C E G | G B D | Am | D F# A | G B D
			const chd=[[392,493,587],[523,659,784],[587,740,880],[523,659,784],
			           [392,493,587],[440,587,659],[587,740,880],[392,493,587]];
			const arp=[392,493,587,659,784,880,784,659];
			const bss=[196,131,165,196,196,220,165,196];
			function loop(){
				if(!running)return;
				const s=t%32;
				pl('triangle',mel[s],.18,.007,.10,.04);
				if(s%2===1)pl('square',arp[s%8],.08,.004,.04,.02);
				if(s%4===0){
					for(const f of chd[(s/4)%8])pl('triangle',f,.052,.01,.18,.06);
					pl('triangle',bss[(s/4)%8],.13,.005,.28,.06);
				}
				if(t%16===0)kick(.12);
				if(t%8===4)snare(.07);
				if(s%2===0)hihat(.03,.06);
				t++;setTimeout(loop,125);
			}loop();
			}
		});
	}
}