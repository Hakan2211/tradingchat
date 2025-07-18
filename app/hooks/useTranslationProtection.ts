// hooks/useTranslationProtection.ts
import { useEffect } from 'react';

export function useTranslationProtection() {
  useEffect(() => {
    const originalInsertBefore = Node.prototype.insertBefore;
    const originalRemoveChild = Node.prototype.removeChild;

    Node.prototype.insertBefore = function <T extends Node>(
      newNode: T,
      referenceNode: Node | null
    ): T {
      try {
        if (referenceNode && !this.contains(referenceNode)) {
          console.warn(
            'TranslationProtection: referenceNode is not a child, appending instead'
          );
          return this.appendChild(newNode) as T;
        }
        return originalInsertBefore.call(this, newNode, referenceNode) as T;
      } catch (error) {
        console.warn(
          'TranslationProtection: insertBefore failed, falling back to appendChild',
          error
        );
        return this.appendChild(newNode) as T;
      }
    };

    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      try {
        if (!this.contains(child)) {
          console.warn(
            'TranslationProtection: child is not a child of this node'
          );
          return child;
        }
        return originalRemoveChild.call(this, child) as T;
      } catch (error) {
        console.warn('TranslationProtection: removeChild failed', error);
        return child;
      }
    };

    return () => {
      Node.prototype.insertBefore = originalInsertBefore;
      Node.prototype.removeChild = originalRemoveChild;
    };
  }, []);
}
