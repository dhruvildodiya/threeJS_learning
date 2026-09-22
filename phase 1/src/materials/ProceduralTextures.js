import * as THREE from 'three';

export class ProceduralTextures {
    static createDialTexture() {
        const size = 1024;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        const cx = size / 2, cy = size / 2, r = size / 2;

        // Base
        ctx.fillStyle = '#0d1014';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Subtle radial sheen
        const sheen = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
        sheen.addColorStop(0, 'rgba(255,255,255,0.08)');
        sheen.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sheen;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Minute ticks (60) and hour markers (12, thicker)
        for (let i = 0; i < 60; i++) {
            const angle = (i / 60) * Math.PI * 2;
            const isHour = i % 5 === 0;
            const inner = isHour ? r * 0.86 : r * 0.92;
            const outer = r * 0.97;
            ctx.strokeStyle = isHour ? '#e8e8ec' : '#4a4a52';
            ctx.lineWidth = isHour ? size * 0.006 : size * 0.0022;
            ctx.beginPath();
            ctx.moveTo(cx + Math.sin(angle) * inner, cy - Math.cos(angle) * inner);
            ctx.lineTo(cx + Math.sin(angle) * outer, cy - Math.cos(angle) * outer);
            ctx.stroke();
        }

        // Date window at 3 o'clock
        ctx.fillStyle = '#f4f4f5';
        ctx.fillRect(cx + r * 0.6 - 28, cy - 20, 56, 40);
        ctx.fillStyle = '#111';
        ctx.font = `600 ${size * 0.032}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(new Date().getDate()).padStart(2, '0'), cx + r * 0.6, cy + 1);

        // Brand mark + complication label
        ctx.fillStyle = '#e8e8ec';
        ctx.font = `500 ${size * 0.045}px Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText('VALIO', cx, cy - r * 0.32);
        ctx.font = `300 ${size * 0.02}px monospace`;
        ctx.fillStyle = '#6b6b74';
        ctx.fillText('AUTOMATIC · 100M', cx, cy - r * 0.24);

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    static createLeatherBump() {
        const size = 256;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(size, size);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = 118 + Math.random() * 20;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 6);
        return tex;
    }

    static createLeatherColorTexture() {
        const size = 256;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#8a7355';
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 5000; i++) {
            const v = -25 + Math.random() * 50;
            ctx.fillStyle = `rgba(${60 + v}, ${48 + v}, ${34 + v}, 0.35)`;
            ctx.beginPath();
            ctx.arc(Math.random() * size, Math.random() * size, 0.6 + Math.random() * 1.3, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < 14; i++) {
            ctx.strokeStyle = 'rgba(30,22,14,0.25)';
            ctx.lineWidth = 1;
            const y = Math.random() * size;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 12, size * 0.7, y + (Math.random() - 0.5) * 12, size, y);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 6);
        return tex;
    }

    static createBrushedMetalTexture() {
        const size = 256;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');

        ctx.fillStyle = '#9a9a9a';
        ctx.fillRect(0, 0, size, size);
        for (let y = 0; y < size; y++) {
            const v = 130 + Math.random() * 90;
            ctx.strokeStyle = `rgb(${v},${v},${v})`;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 1);
        return tex;
    }

    static createCornerShadowTexture() {
        const c = document.createElement('canvas');
        c.width = 16;
        c.height = 256;
        const ctx = c.getContext('2d');
        const grad = ctx.createLinearGradient(0, 256, 0, 0);
        grad.addColorStop(0, 'rgba(10, 10, 14, 0.7)');
        grad.addColorStop(0.3, 'rgba(10, 10, 14, 0.35)');
        grad.addColorStop(0.7, 'rgba(10, 10, 14, 0.08)');
        grad.addColorStop(1, 'rgba(10, 10, 14, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 256);
        return new THREE.CanvasTexture(c);
    }
}
