// swipe.js (修正版)
class SwipeController {
  constructor(targetCanvas) {
    this.target = targetCanvas;
    
    // エフェクト用のキャンバスを作成
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // 元のキャンバスの直後に挿入
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
    // 【重要】元のcanvasに「絶対座標」で完全にピタッと重ねる（レイアウトを崩さない）
    this.canvas.width = this.target.width;
    this.canvas.height = this.target.height;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = this.target.offsetLeft + 'px';
    this.canvas.style.top = this.target.offsetTop + 'px';
    this.canvas.style.width = this.target.style.width || (this.target.clientWidth + 'px');
    this.canvas.style.height = this.target.style.height || (this.target.clientHeight + 'px');
    
    // ゲーム画面を隠さないための必須設定
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
      
      const dx = this.currentX - this.lastX;
      const dy = this.currentY - this.lastY;
      
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        // 逆方向に飛び散る残像
        this.particles.push({
          x: this.currentX,
          y: this.currentY,
          vx: -dx * 0.2 + (Math.random() - 0.5) * 4,
          vy: -dy * 0.2 + (Math.random() - 0.5) * 4,
          life: 1.0,
          size: Math.random() * 6 + 3
        });
      }
      this.lastX = this.currentX;
      this.lastY = this.currentY;
    };

    const end = (e) => {
      if (!this.isSwiping) return;
      this.isSwiping = false;
      
      const dx = this.currentX - this.startX;
      const dy = this.currentY - this.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 30) {
        this.triggerDirection(dx, dy);
        this.spawnRipple(this.currentX, this.currentY, "rgba(142, 240, 184, 0.6)");
      }
    };

    // 元のゲーム画面（target）を触ったときにイベントを開始する
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
    
    // エフェクト描画
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
    
    // 引っ張るラインの描画
    if (this.isSwiping) {
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
