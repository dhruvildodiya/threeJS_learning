import './styles/main.css';
import { Experience } from './core/Experience';
import { UIController } from './ui/UIController';

declare global {
  interface Window {
    experience?: Experience;
    uiController?: UIController;
  }
}

function bootstrap(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#webgl');

  if (!canvas) {
    console.error('Fatal: Failed to locate target #webgl canvas element.');
    return;
  }

  const experience = new Experience(canvas);
  const uiController = new UIController(experience);

  // Hook UI meter updates to the experience tick loop
  experience.time.onTick(() => {
    uiController.update();
  });

  window.experience = experience;
  window.uiController = uiController;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
