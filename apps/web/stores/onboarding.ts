import { defineStore } from "pinia";

interface OnboardingState {
  isCompleted: boolean;
  showModal: boolean;
  currentStep: number;
  savedData: Record<string, any>;
}

export const useOnboardingStore = defineStore("onboarding", {
  state: (): OnboardingState => ({
    isCompleted: false,
    showModal: false,
    currentStep: 0,
    savedData: {},
  }),

  getters: {
    needsOnboarding: (state) => !state.isCompleted,
  },

  actions: {
    setOnboardingStatus(completed: boolean) {
      this.isCompleted = completed;
    },

    showOnboarding() {
      this.showModal = true;
    },

    hideOnboarding() {
      this.showModal = false;
    },

    setCurrentStep(step: number) {
      this.currentStep = step;
    },

    saveStepData(stepId: string, data: any) {
      this.savedData[stepId] = data;
    },

    completeOnboarding() {
      this.isCompleted = true;
      this.showModal = false;
      this.currentStep = 0;
      this.savedData = {};
    },

    resetOnboarding() {
      this.currentStep = 0;
      this.savedData = {};
    },
  },

  persist: {
    // Only persist the saved data and current step in case user refreshes
    pick: ["savedData", "currentStep"],
  },
});
