import { useEffect } from "react";
import { mapActionToView } from "../../animation/mapActionToView";
import {
  getCurrentState,
  handleUserInteraction,
  startBehaviorLoop,
  stopBehaviorLoop,
  subscribeBehaviorTick
} from "../../bridge/tauri";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { UserEvent } from "../../types/tokki";
import { TokkiAvatarAsset } from "./TokkiAvatarAsset";

function makeUserEvent(type: UserEvent["type"]): UserEvent {
  return {
    type,
    timestamp: Date.now()
  };
}

export function TokkiCharacter(): JSX.Element {
  const state = useTokkiStore((store) => store.state);
  const connected = useTokkiStore((store) => store.connected);
  const applyTick = useTokkiStore((store) => store.applyTick);
  const setState = useTokkiStore((store) => store.setState);
  const setConnected = useTokkiStore((store) => store.setConnected);

  useEffect(() => {
    let mounted = true;
    let teardown: (() => void) | undefined;

    (async () => {
      teardown = await subscribeBehaviorTick((tick) => {
        applyTick(tick);
      });

      await startBehaviorLoop();
      const current = await getCurrentState();
      if (!mounted) {
        return;
      }
      setState(current);
      setConnected(true);
    })().catch((error: unknown) => {
      console.error("Tokki runtime init failed", error);
      setConnected(false);
    });

    return () => {
      mounted = false;
      teardown?.();
      void stopBehaviorLoop();
    };
  }, [applyTick, setConnected, setState]);

  const onInteract = async (type: UserEvent["type"]): Promise<void> => {
    const tick = await handleUserInteraction(makeUserEvent(type));
    applyTick(tick);
  };

  const actionView = mapActionToView(state.current_action);
  const status = connected ? "Connected" : "Disconnected";

  return (
    <section className="tokki-card" aria-label="Tokki">
      <div className="tokki-stage">
        <button
          type="button"
          className={`tokki-avatar ${actionView.toneClass} ${actionView.stateClass}`}
          onClick={() => {
            void onInteract("click");
          }}
          onMouseEnter={() => {
            void onInteract("hover");
          }}
          onMouseDown={() => {
            void onInteract("drag_start");
          }}
          onMouseUp={() => {
            void onInteract("drag_end");
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            void onInteract("poke");
          }}
          data-testid="tokki-avatar"
          aria-label="Tokki avatar"
        >
          <TokkiAvatarAsset assetId={actionView.assetId} />
        </button>
      </div>

      <div className="tokki-debug" aria-hidden="true">
        <span data-testid="tokki-status">{status}</span>
        <span data-testid="tokki-action">{state.current_action.id}</span>
        <span data-testid="tokki-mood">{state.current_action.mood}</span>
        <span data-testid="tokki-energy">{state.energy}</span>
        <span data-testid="tokki-label">{actionView.label}</span>
      </div>
    </section>
  );
}
