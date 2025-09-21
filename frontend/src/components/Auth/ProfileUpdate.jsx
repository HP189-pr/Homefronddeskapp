// Path: src/components/Auth/ProfileUpdate.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = 'http://127.0.0.1:8000';

const ProfileUpdate = ({ setWorkArea }) => {
  const { user, fetchUserProfile } = useAuth();
  const [profile, setProfile] = useState({
    identifier: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    usrpic: '',
    profile_picture_file: null,
  });

  // Populate form with logged-in user’s data
  useEffect(() => {
    if (user) {
      setProfile({
        identifier: user.usercode || user.userid || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        usrpic: user.usrpic
          ? `${API_BASE_URL}/media/Profpic/${user.usrpic}`
          : '/default-profile.png',
        profile_picture_file: null,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setProfile((prev) => ({ ...prev, profile_picture_file: file }));

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfile((prev) => ({ ...prev, usrpic: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token'); // ✅ match useAuth
    const formData = new FormData();

    const appendIfExists = (key, value) => {
      if (value) formData.append(key, value);
    };

    appendIfExists('first_name', profile.first_name);
    appendIfExists('last_name', profile.last_name);
    appendIfExists('email', profile.email);
    appendIfExists('phone', profile.phone);
    appendIfExists('address', profile.address);
    appendIfExists('city', profile.city);

    if (profile.profile_picture_file) {
      formData.append('usrpic', profile.profile_picture_file);
    }

    try {
      await axios.patch(`${API_BASE_URL}/api/profile/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('✅ Profile updated successfully!');
      if (typeof fetchUserProfile === 'function') {
        await fetchUserProfile();
      }
      setWorkArea(null);
    } catch (error) {
      console.error('❌ Error updating profile:', error.response?.data || error.message);
      alert('❌ Failed to update profile.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-white shadow-md rounded"
    >
      <h2 className="text-lg font-bold text-gray-700">Update Profile</h2>

      <div>
        <label className="block font-semibold">User ID (cannot change)</label>
        <input
          type="text"
          name="identifier"
          value={profile.identifier}
          disabled
          className="border p-2 w-full bg-gray-200"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold">First Name</label>
          <input
            type="text"
            name="first_name"
            value={profile.first_name}
            onChange={handleChange}
            className="border p-2 w-full"
          />
        </div>

        <div>
          <label className="block font-semibold">Last Name</label>
          <input
            type="text"
            name="last_name"
            value={profile.last_name}
            onChange={handleChange}
            className="border p-2 w-full"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold">Email</label>
        <input
          type="email"
          name="email"
          value={profile.email}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-semibold">Phone</label>
          <input
            type="text"
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            className="border p-2 w-full"
          />
        </div>

        <div>
          <label className="block font-semibold">City</label>
          <input
            type="text"
            name="city"
            value={profile.city}
            onChange={handleChange}
            className="border p-2 w-full"
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold">Address</label>
        <input
          type="text"
          name="address"
          value={profile.address}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>

      {/* Profile Picture Upload */}
      <div>
        <label className="block font-semibold">Profile Picture</label>
        <input
          type="file"
          name="usrpic"
          accept="image/*"
          onChange={handleFileChange}
          className="border p-2 w-full"
        />
        <div className="mt-2 flex items-center space-x-4">
          <img
            src={profile.usrpic}
            alt="Profile"
            className="w-24 h-24 object-cover rounded shadow-md"
          />
          {profile.profile_picture_file && (
            <span className="text-sm text-gray-600">New image selected</span>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="bg-blue-500 text-white p-2 rounded w-full hover:bg-blue-600"
      >
        Save Changes
      </button>
    </form>
  );
};

ProfileUpdate.propTypes = {
  setWorkArea: PropTypes.func.isRequired,
};

export default ProfileUpdate;
