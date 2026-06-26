// swipe.js
class SwipeController {
  constructor(targetCanvas) {
    this.target = targetCanvas;
    
    // エフェクト描画用の透明なキャンバスを作成して上に重ねる
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // 親要素をrelativeにして絶対座標で重ねる
    this.target.parentElement.style.position = 'relative';
    this.target.parentElement.appendChild(this.canvas);
    
    this.isSwiping = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.particles = []; // 残像パーティクル
    
    this.setupCanvas();
    this.bindEvents();
    this.animate();
    
    // 画面リサイズ時にキャンバスサイズも合わせる
    window.addEventListener('resize', () => this.setupCanvas());
  }

  setupCanvas() {
    // ターゲット（ゲーム画面）と全く同じ位置・サイズにする
    this.canvas.width = this.target.clientWidth;
    this.canvas.height = this.target.clientHeight;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = this.target.offsetTop + 'px';
    this.canvas.style.left = this.target.offsetLeft + 'px';
    // クリック判定は下のゲーム画面に貫通させる
    this.canvas.style.pointerEvents = 'none'; 
    this.canvas.style.zIndex = '100';
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  bindEvents() {
    const start = (e) => {
      // 画面のスクロールを防ぐ
      if (e.cancelable) e.preventDefault();
      
      this.isSwiping = true;
      const pos = this.getPos(e);
      this.startX = this.lastX = this.currentX = pos.x;
      this.startY = this.lastY = this.currentY = pos.y;
      this.particles = [];
      
      // スタート時に波紋エフェクト
      this.spawnRipple(this.startX, this.startY);
    };

    const move = (e) => {
      if (!this.isSwiping) return;
      if (e.cancelable) e.preventDefault();
      
      const pos = this.getPos(e);
      this.currentX = pos.x;
      this.currentY = pos.y;
      
      // 動かした方向の【逆方向】に散る残像パーティクルを生成
      const dx = this.currentX - this.lastX;
      const dy = this.currentY - this.lastY;
      
      // 指を動かしていればパーティクル追加
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        this.particles.push({
          x: this.currentX,
          y: this.currentY,
          // 逆方向(-dx, -dy)に少し勢いをつけて飛ばす
          vx: -dx * 0.15 + (Math.random() - 0.5) * 3,
          vy: -dy * 0.15 + (Math.random() - 0.5) * 3,
          life: 1.0,
          size: Math.random() * 4 + 2
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
      
      // 一定距離(30px)以上スワイプしていたら方向を判定
      if (dist > 30) {
        this.triggerDirection(dx, dy);
        // 成功エフェクト
        this.spawnRipple(this.currentX, this.currentY, "rgba(142, 240, 184, 0.6)");
      }
    };

    // タッチイベント（スマホ）
    this.target.addEventListener('touchstart', start, { passive: false });
    this.target.addEventListener('touchmove', move, { passive: false });
    this.target.addEventListener('touchend', end);
    this.target.addEventListener('touchcancel', end);

    // マウスイベント（PCテスト用）
    this.target.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
  }

  // スワイプの角度からキー入力を偽装する関数
  triggerDirection(dx, dy) {
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // ゲーム側で定義されている方向と角度の対応表
    const targets = { 'w': -90, 'e': -30, 'd': 30, 's': 90, 'a': 150, 'q': -150 };
    
    let bestKey = null;
    let minDiff = 360;
    
    // 最も角度が近いキーを探す
    for (let key in targets) {
      let want_ang = targets[key];
      let diff = Math.abs((angleDeg - want_ang + 180) % 360 - 180);
      if (diff < minDiff) {
        minDiff = diff;
        bestKey = key;
      }
    }
    
    if (bestKey) {
      // JavaScript上で「キーボードが押された」ことにしてゲームに伝える
      document.dispatchEvent(new KeyboardEvent('keydown', { key: bestKey }));
    }
  }

  spawnRipple(x, y, color = "rgba(255, 255, 255, 0.5)") {
    this.particles.push({
      x: x, y: y,
      vx: 0, vy: 0,
      life: 1.0,
      size: 5,
      isRipple: true,
      color: color
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // 前のフレームをクリア（少し残像を残す表現にしても綺麗ですが今回は完全クリア）
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // パーティクルの更新と描画
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.life -= 0.04;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      
      if (p.isRipple) {
        // 波紋エフェクト
        this.ctx.beginPath();
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 3 * p.life;
        this.ctx.arc(p.x, p.y, p.size + (1 - p.life) * 30, 0, Math.PI * 2);
        this.ctx.stroke();
      } else {
        // スワイプの逆方向に飛ぶ残像エフェクト
        p.x += p.vx;
        p.y += p.vy;
        this.ctx.beginPath();
        this.ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 0.8})`;
        this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    // スワイプ中のライン表示
    if (this.isSwiping) {
      // 起点
      this.ctx.beginPath();
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      this.ctx.lineWidth = 2;
      this.ctx.arc(this.startX, this.startY, 20, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // 現在の指の位置
      this.ctx.beginPath();
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      this.ctx.arc(this.currentX, this.currentY, 12, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 引っ張っている糸
      this.ctx.beginPath();
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.lineWidth = 4;
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineTo(this.currentX, this.currentY);
      this.ctx.stroke();
    }
  }
}

// ページ読み込み完了時にスワイプ機能をキャンバスに適用する
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas');
  if (canvas) {
    new SwipeController(canvas);
  }
});
