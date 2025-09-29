<script setup lang="ts">
import { ref, computed } from "vue";
import { validateCron } from "./lib/validator";
import { decodeCron } from "./lib/decoder";

const SYMBOLS = [
  { symbol: "*", description: "wildcard any value" },
  { symbol: ",", description: "value list separator. (eg: 0,15,30)" },
  {
    symbol: "-",
    description: "range of values. (eg: 4-7 -> from 4 through 7)",
  },
  { symbol: "/", description: "step values. (eg: 2/3 -> every 3rd from 2nd)" },
] as const;

const cronExpr = ref("* * * * *");
const error = ref("");

const hanldeCron = (cron: string) => {
  const isCronValid = validateCron(cron);
  if (!isCronValid) {
    error.value = "Invalid cron format";
    return;
  }
  const val = decodeCron(cron);
  if (!val) {
    error.value = "something went wrong while decoding";
    return;
  }
  error.value = "";

  return val;
};

const decoded = computed(() => hanldeCron(cronExpr.value));
</script>

<template>
  <main
    class="flex flex-col items-center sm:max-w-xl md:max-w-[850px] my-0 mx-auto"
  >
    <h1 class="text-3xl font-bold mb-10 text-[#190075]">Crontab decoder</h1>

    <input
      name="cron-expression"
      v-model="cronExpr"
      type="text"
      class="text-4xl leading-10 text-center w-full rounded-xs border-4 py-2 px-5 border-solid border-[#5319ff] focus:outline-0 focus:shadow-xl"
      :class="{ 'border-red-500': !!error }"
    />

    <div class="flex flex-wrap wrap-anywhere">
      <div
        class="flex flex-1 font-bold text-4xl text-center w-full min-h-9 mt-10 mb-8"
      >
        {{ decoded }}
      </div>
    </div>

    <div class="text-xl text-red-500">{{ error }}</div>

    <div
      class="flex flex-col w-full max-w-96 gap-y-1.5 rounded border border-[#5319ff] p-2.5 mt-10"
    >
      <div class="flex items-center justify-between mb-1.5 border-b">
        <div class="font-bold">Symbol</div>
        <div class="font-bold">Meaning</div>
      </div>
      <div
        v-for="item in SYMBOLS"
        :key="item.symbol"
        class="flex items-center justify-between"
      >
        <div>{{ item.symbol }}</div>
        <div>{{ item.description }}</div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
