// swipe.js (連続スティック入力対応版)
class SwipeController {
  constructor(targetCanvas) {
    this.target = targetCanvas;
    
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.target.parentNode.insertBefore(this.canvas, this.target.nextSibling);
    
    this.isSwiping = false;
    this.startX = 0; this.startY = 0;
    this.currentX = 0; this.currentY = 0;
    this.lastX = 0; this.lastY = 0;
    this.particles = [];
    
    this.setupCanvas();
    this.bindEvents();
    this.animate();
    
    window.addEventListener('resize', () => this.setupCanvas());
  }

  setupCanvas() {
    this.canvas.width = this.target.width;
    this.canvas.height = this.target.height;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0px';
    this.canvas.style.top = '0px';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none'; 
    this.canvas.style.background = 'transparent'; 
    this.canvas.style.zIndex = '100';
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  bindEvents() {
    const start = (e) => {
      if (e.cancelable) e.preventDefault();
      this.isSwiping = true;
      const pos = this.getPos(e);
      this.startX = this.lastX = this.currentX = pos.x;
      this.startY = this.lastY = this.currentY = pos.y;
      this.particles = [];
      this.spawnRipple(this.startX, this.startY);
    };

    const move = (e) => {
      if (!this.isSwiping) return;
      if (e.cancelable) e.preventDefault();
      
      const pos = this.getPos(e);
      this.currentX = pos.x;
      this.currentY = pos.y;
      
      // パーティクル（残像）の生成
      const dxParticle = this.currentX - this.lastX;
      const dyParticle = this.currentY - this.lastY;
      
      if (Math.abs(dxParticle) > 1 || Math.abs(dyParticle) > 1) {
        this.particles.push({
          x: this.currentX,
          y: this.currentY,
          vx: -dxParticle * 0.2 + (Math.random() - 0.5) * 4,
          vy: -dyParticle * 0.2 + (Math.random() - 0.5) * 4,
          life: 1.0,
          size: Math.random() * 6 + 3
        });
      }

      // 連続入力の判定：基準点（startX, Y）からの距離を測る
      const dxInput = this.currentX - this.startX;
      const dyInput = this.currentY - this.startY;
      const dist = Math.sqrt(dxInput * dxInput + dyInput * dyInput);
      
      // 30px以上引っ張ったら方向決定し、そこを新たな基準点にする！
      if (dist > 30) {
        this.triggerDirection(dxInput, dyInput);
        this.spawnRipple(this.currentX, this.currentY, "rgba(142, 240, 184, 0.6)");
        
        // ★ここがポイント：入力が済んだら起点を今の指の位置にリセット
        this.startX = this.currentX;
        this.startY = this.currentY;
      }

      this.lastX = this.currentX;
      this.lastY = this.currentY;
    };

    const end = (e) => {
      // 指を離した時は判定を終了するだけ（move側で入力済みのため）
      this.isSwiping = false;
    };

    this.target.addEventListener('touchstart', start, { passive: false });
    this.target.addEventListener('touchmove', move, { passive: false });
    this.target.addEventListener('touchend', end);
    
    this.target.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
  }

  triggerDirection(dx, dy) {
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
    const targets = { 'w': -90, 'e': -30, 'd': 30, 's': 90, 'a': 150, 'q': -150 };
    
    let bestKey = null;
    let minDiff = 360;
    
    for (let key in targets) {
      let want_ang = targets[key];
      let diff = Math.abs((angleDeg - want_ang + 180) % 360 - 180);
      if (diff < minDiff) {
        minDiff = diff;
        bestKey = key;
      }
    }
    
    if (bestKey) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: bestKey }));
    }
  }

  spawnRipple(x, y, color = "rgba(255, 255, 255, 0.5)") {
    this.particles.push({
      x: x, y: y, vx: 0, vy: 0, life: 1.0, size: 5, isRipple: true, color: color
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.life -= 0.04;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      if (p.isRipple) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 4 * p.life;
        this.ctx.arc(p.x, p.y, p.size + (1 - p.life) * 40, 0, Math.PI * 2);
        this.ctx.stroke();
      } else {
        p.x += p.vx;
        p.y += p.vy;
        this.ctx.beginPath();
        this.ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.8})`;
        this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    if (this.isSwiping) {
      // 基準点のリング（移動するたびに指の位置に追従してくる）
      this.ctx.beginPath();
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      this.ctx.lineWidth = 3;
      this.ctx.arc(this.startX, this.startY, 20, 0, Math.PI * 2);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      this.ctx.arc(this.currentX, this.currentY, 14, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.beginPath();
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      this.ctx.lineWidth = 4;
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineTo(this.currentX, this.currentY);
      this.ctx.stroke();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');
  if (canvas) {
    new SwipeController(canvas);
  }
});
