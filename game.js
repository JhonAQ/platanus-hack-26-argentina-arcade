/* Añade tus archivos en base64 en este array. Asegúrate de que incluyan el prefijo 'data:image/...;base64,' */
const base64Images = [
	"data:image/png;base64,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", /* Imagen 1 */
	"data:image/png;base64,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",,
	"data:image/png;base64,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", /* Imagen 3 */
	"data:image/png;base64,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"  /* Imagen 4 */
];

function preload() {
	base64Images.forEach((data, index) => {
		if (data && data.trim() !== "") {
			let src = data.trim();
			if (!src.startsWith('data:image')) {
				/* Por defecto asumimos PNG si no tiene el prefijo */
				src = 'data:image/png;base64,' + src;
			}
			this.load.image('gal' + index, src);
		}
	});
}

const config={
	type:Phaser.AUTO,
	width:800,
	height:600,
	backgroundColor:'#111',
	pixelArt:true,
	parent:'game-root',
	scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
	scene:{preload, create}
};
new Phaser.Game(config);

function create() {
	/* ========================================================================= */
	/* ASSETS & GRAPHICS ZONE */
	/* ========================================================================= */
	/* All visual assets (sprites, backgrounds, UI elements) should be managed here. */
	
	/* Setup stylized title */
	const titleText = this.add.text(400, 150, 'FRACTURE\nSYSTEM', {
		fontFamily: 'monospace',
		fontSize: 72,
		align: 'center',
		color: '#0ff',
		fontStyle: 'bold',
		stroke: '#000',
		strokeThickness: 8,
		shadow: { offsetX: 0, offsetY: 0, color: '#0ff', blur: 20, stroke: true, fill: true },
		padding: { left: 20, right: 20, top: 20, bottom: 20 }
	}).setOrigin(0.5);

	/* Setup play button */
	const playBtn = this.add.text(400, 350, 'PLAY', {
		fontFamily: 'monospace',
		fontSize: 48,
		color: '#fff',
		backgroundColor: '#333',
		padding: { x: 20, y: 10 }
	}).setOrigin(0.5).setInteractive({useHandCursor: true});

	playBtn.on('pointerover', () => playBtn.setStyle({ color: '#ff0', backgroundColor: '#555' }));
	playBtn.on('pointerout', () => playBtn.setStyle({ color: '#fff', backgroundColor: '#333' }));

	/* ========================================================================= */
	/* LOGIC ZONE */
	/* ========================================================================= */
	playBtn.on('pointerdown', () => {
		titleText.setVisible(false);
		playBtn.setVisible(false);
		
		/* Stop any previous loop if any */
		window._chipLoop && window._chipLoop.stop && window._chipLoop.stop();
		
		const ctx = window._audioCtx || (window._audioCtx = new(window.AudioContext || window.webkitAudioContext)());
		if(ctx.state === 'suspended') ctx.resume();
		let running = true;
		function stop() { running = false; }
		window._chipLoop = { stop };

		/* ========================================================================= */
		/* AUDIO LOOPS ZONE */
		/* ========================================================================= */
		/* Helpers */
		function pl(type, freq, gain, atk, sus, rel) {
			if (!freq) return;
			const o = ctx.createOscillator(), g = ctx.createGain();
			o.type = type; o.frequency.value = freq;
			const t = ctx.currentTime;
			g.gain.setValueAtTime(0, t);
			g.gain.linearRampToValueAtTime(gain, t + atk);
			g.gain.setValueAtTime(gain * .78, t + atk + sus);
			g.gain.linearRampToValueAtTime(0, t + atk + sus + rel);
			o.connect(g); g.connect(ctx.destination);
			o.start(t); o.stop(t + atk + sus + rel + .01);
			o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (_) {} };
		}
		function kick(v) {
			const o = ctx.createOscillator(), g = ctx.createGain();
			const t = ctx.currentTime;
			o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(26, t + .09);
			g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .09);
			o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + .1);
			o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (_) {} };
		}
		function snare(v) {
			const len = Math.ceil(ctx.sampleRate * .13), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
			for (let j = 0; j < len; j++) d[j] = Math.random() * 2 - 1;
			const src = ctx.createBufferSource(); src.buffer = buf;
			const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 2500; flt.Q.value = .9;
			const g = ctx.createGain(); const t = ctx.currentTime;
			g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .13);
			src.connect(flt); flt.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + .14);
			src.onended = () => { try { src.disconnect(); flt.disconnect(); g.disconnect(); } catch (_) {} };
		}
		function hihat(v, dur) {
			const len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
			for (let j = 0; j < len; j++) d[j] = Math.random() * 2 - 1;
			const src = ctx.createBufferSource(); src.buffer = buf;
			const flt = ctx.createBiquadFilter(); flt.type = 'highpass'; flt.frequency.value = 7800;
			const g = ctx.createGain(); const t = ctx.currentTime;
			g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
			src.connect(flt); flt.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + dur + .01);
			src.onended = () => { try { src.disconnect(); flt.disconnect(); g.disconnect(); } catch (_) {} };
		}

		/* ── LEVEL · WILY FORTRESS (Initial Phase Loop) ── */
		let t = 0;
		const mel = [
			587, 0, 587, 523, 466, 0, 440, 0,
			392, 440, 466, 0, 523, 0, 587, 0,
			698, 0, 698, 587, 523, 0, 466, 0,
			440, 466, 523, 0, 554, 0, 587, 0
		];
		const ctr = [
			293, 349, 392, 349,
			293, 262, 220, 262
		];
		const bss = [
			147, 147, 147, 147,
			116, 116, 116, 116,
			174, 174, 174, 174,
			110, 110, 110, 110
		];
		function loop() {
			if (!running) return;
			const s = t % 32;
			pl('square', mel[s], .15, .004, .072, .023);
			if (s % 4 === 0) { pl('sawtooth', ctr[(s / 4) % 8], .065, .008, .14, .04); }
			if (s % 4 === 0) { pl('triangle', bss[(s / 4) % 8], .14, .005, .26, .06); }
			const d = t % 16;
			if (d === 0 || d === 8) kick(.7);
			if (d === 4 || d === 12) snare(.38);
			if (t % 2 === 0) hihat(.16, .048);
			t++; setTimeout(loop, 100);
		}
		loop();

		/* Game logic initialization after pressing PLAY */
		/* ... */
	});
}

