import type { InteractionManager } from './InteractionManager';
import type { Collectibles } from './Collectibles';
import type { SoundEffects } from './SoundEffects';

export class GameHUD {
  private interaction: InteractionManager;
  private collectibles: Collectibles;
  private sfx: SoundEffects;

  private questEl!: HTMLDivElement;
  private promptEl!: HTMLDivElement;
  private victoryModal!: HTMLDivElement;
  private hasWon = false;

  constructor(
    interaction: InteractionManager,
    collectibles: Collectibles,
    sfx: SoundEffects
  ) {
    this.interaction = interaction;
    this.collectibles = collectibles;
    this.sfx = sfx;

    this.createElements();
  }

  private createElements(): void {
    // 1. Quest Tracker (Top Left)
    this.questEl = document.createElement('div');
    this.questEl.id = 'hud-quests';
    this.questEl.className = 'hud-card hud-top-left';
    document.body.appendChild(this.questEl);

    // 2. Interaction Banner (Center Screen Lower)
    this.promptEl = document.createElement('div');
    this.promptEl.id = 'hud-prompt';
    this.promptEl.className = 'hud-prompt hidden';
    document.body.appendChild(this.promptEl);

    // 3. Victory Modal
    this.victoryModal = document.createElement('div');
    this.victoryModal.id = 'hud-victory';
    this.victoryModal.className = 'hud-modal hidden';
    this.victoryModal.innerHTML = `
      <div class="hud-modal-card">
        <div class="victory-icon">🎉🏝️✨</div>
        <h2>Island Adventure Complete!</h2>
        <p>You have restored the island, collected all magical crystals, ignited the beacon, and explored the keeper's cottage!</p>
        <button id="close-victory-btn" class="hud-btn">Keep Exploring</button>
      </div>
    `;
    document.body.appendChild(this.victoryModal);

    const closeBtn = document.querySelector<HTMLButtonElement>('#close-victory-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.victoryModal.classList.add('hidden');
      });
    }
  }

  public update(): void {
    const crystalsDone = this.collectibles.collectedCount;
    const crystalsTotal = this.collectibles.totalCount;
    const cottageDone = this.interaction.questCottageEntered;
    const beaconDone = this.interaction.questBeaconLit;
    const boatDone = this.interaction.questBoatRidden;

    // Update quest tracker HTML
    this.questEl.innerHTML = `
      <div class="hud-title">🏝️ Island Quests</div>
      <ul class="quest-list">
        <li class="${crystalsDone === crystalsTotal ? 'done' : ''}">
          <span class="quest-checkbox">${crystalsDone === crystalsTotal ? '✓' : '○'}</span>
          <span>Find Crystals (${crystalsDone}/${crystalsTotal})</span>
        </li>
        <li class="${cottageDone ? 'done' : ''}">
          <span class="quest-checkbox">${cottageDone ? '✓' : '○'}</span>
          <span>Explore Cottage</span>
        </li>
        <li class="${beaconDone ? 'done' : ''}">
          <span class="quest-checkbox">${beaconDone ? '✓' : '○'}</span>
          <span>Ignite Lighthouse Beacon</span>
        </li>
        <li class="${boatDone ? 'done' : ''}">
          <span class="quest-checkbox">${boatDone ? '✓' : '○'}</span>
          <span>Board the Rowboat</span>
        </li>
      </ul>
    `;

    // Update interaction prompt
    if (this.interaction.currentPrompt) {
      this.promptEl.textContent = this.interaction.currentPrompt;
      this.promptEl.classList.remove('hidden');
    } else {
      this.promptEl.classList.add('hidden');
    }

    // Check Victory Condition
    if (!this.hasWon && crystalsDone === crystalsTotal && cottageDone && beaconDone && boatDone) {
      this.hasWon = true;
      this.victoryModal.classList.remove('hidden');
      this.sfx.playVictory();
    }
  }
}

