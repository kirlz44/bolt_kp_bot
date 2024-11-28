/**
 * Проверяет корректность формата даты и времени
 * @param {string} dateTimeStr - Строка с датой и временем в формате "DD.MM.YYYY HH:mm"
 * @returns {Object} { isValid: boolean, date: Date | null, error: string | null }
 */
function validateDateTime(dateTimeStr) {
  try {
    // Проверяем базовый формат
    if (!/^\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}$/.test(dateTimeStr)) {
      return {
        isValid: false,
        date: null,
        error: 'Неверный формат. Используйте формат ДД.ММ.ГГГГ ЧЧ:ММ'
      };
    }

    // Разбиваем строку на компоненты
    const [dateStr, timeStr] = dateTimeStr.split(' ');
    const [day, month, year] = dateStr.split('.').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Создаем объект даты
    const date = new Date(year, month - 1, day, hours, minutes);

    // Проверяем валидность компонентов даты
    if (
      date.getDate() !== day ||
      date.getMonth() + 1 !== month ||
      date.getFullYear() !== year ||
      date.getHours() !== hours ||
      date.getMinutes() !== minutes
    ) {
      return {
        isValid: false,
        date: null,
        error: 'Указана несуществующая дата'
      };
    }

    // Проверяем, что дата не в прошлом
    if (date < new Date()) {
      return {
        isValid: false,
        date: null,
        error: 'Дата не может быть в прошлом'
      };
    }

    return {
      isValid: true,
      date: date,
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      date: null,
      error: 'Ошибка при обработке даты'
    };
  }
}

module.exports = { validateDateTime }; 