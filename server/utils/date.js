export const isWeekend = (value) => {
  const date = new Date(value);
  const day = date.getDay();
  return day === 0 || day === 6;
};
