// backend/controllers/misctoolController.mjs
import { Holiday, Birthday } from '../models/misctool.mjs';
import { Op } from 'sequelize';

/**
 * Holidays
 */
export const getAllHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.findAll();
    res.json(holidays);
  } catch (err) {
    console.error('❌ getAllHolidays error:', err);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
};

export const getHolidayById = async (req, res) => {
  try {
    const { hdid } = req.params;
    const holiday = await Holiday.findByPk(hdid);
    if (!holiday) return res.status(404).json({ error: 'Holiday not found' });
    res.json(holiday);
  } catch (err) {
    console.error('❌ getHolidayById error:', err);
    res.status(500).json({ error: 'Failed to fetch holiday' });
  }
};

export const getRecentHolidays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidays = await Holiday.findAll({
      where: { holiday_date: { [Op.lte]: today } },
      order: [['holiday_date', 'DESC']],
    });
    res.json(holidays);
  } catch (err) {
    console.error('❌ getRecentHolidays error:', err);
    res.status(500).json({ error: 'Failed to fetch recent holidays' });
  }
};

export const getUpcomingHolidays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidays = await Holiday.findAll({
      where: { holiday_date: { [Op.gte]: today } },
      order: [['holiday_date', 'ASC']],
    });
    res.json(holidays);
  } catch (err) {
    console.error('❌ getUpcomingHolidays error:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming holidays' });
  }
};

/**
 * Birthdays
 */
export const getAllBirthdays = async (req, res) => {
  try {
    const birthdays = await Birthday.findAll();
    res.json(birthdays);
  } catch (err) {
    console.error('❌ getAllBirthdays error:', err);
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
};

export const getRecentBirthdays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 15);

    const birthdays = await Birthday.findAll({
      where: { birth_date: { [Op.between]: [pastDate, today] } },
      order: [['birth_date', 'DESC']],
    });

    res.json(birthdays);
  } catch (err) {
    console.error('❌ getRecentBirthdays error:', err);
    res.status(500).json({ error: 'Failed to fetch recent birthdays' });
  }
};

export const getUpcomingBirthdays = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setMonth(today.getMonth() + 2);

    const birthdays = await Birthday.findAll({
      where: { birth_date: { [Op.between]: [today, futureDate] } },
      order: [['birth_date', 'ASC']],
    });

    res.json(birthdays);
  } catch (err) {
    console.error('❌ getUpcomingBirthdays error:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
  }
};
