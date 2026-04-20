import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const currentSection = ref('serviceActivity');
  const isDarkMode = ref(typeof localStorage !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false);
  const isLoggedIn = ref(true);

  function setCurrentSection(section: string) {
    currentSection.value = section;
  }

  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value;
    localStorage.setItem('darkMode', isDarkMode.value.toString());
  }

  function setDarkMode(value: boolean) {
    isDarkMode.value = value;
    localStorage.setItem('darkMode', value.toString());
  }

  function setLoggedIn(value: boolean) {
    isLoggedIn.value = value;
  }

  return {
    currentSection,
    setCurrentSection,
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
    isLoggedIn,
    setLoggedIn,
  };
});
