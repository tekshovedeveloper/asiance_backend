



import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShippingZone, ShippingZoneDocument } from './shipping.schema';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { CreateShippingMethodDto } from './dto/create-shipping-method.dto';

// ---- world-countries safe import (works in Nest CommonJS) ----
const worldCountries = require('world-countries');
const countries: any[] = Array.isArray(worldCountries)
  ? worldCountries
  : Array.isArray(worldCountries?.default)
    ? worldCountries.default
    : [];

function matchRegion(list: string[] = [], value?: string) {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return list.some((item) => String(item).trim().toLowerCase() === v);
}

function findCountry(input: string) {
  const v = (input || '').trim().toLowerCase();
  if (!v) return undefined;

  return countries.find((c: any) => {
    const common = c?.name?.common?.toLowerCase();
    const official = c?.name?.official?.toLowerCase();

    return (
      c?.cca2?.toLowerCase() === v ||
      c?.cca3?.toLowerCase() === v ||
      common === v ||
      official === v ||
      (c?.altSpellings || []).some((s: string) => String(s).toLowerCase() === v)
    );
  });
}

@Injectable()
export class ShippingService {
  constructor(
    @InjectModel(ShippingZone.name)
    private readonly shippingZoneModel: Model<ShippingZoneDocument>,
  ) {}

  async listZones() {
    const zones = await this.shippingZoneModel.find().sort({ createdAt: 1 });

    if (zones.length === 0) {
      const restZone = await this.shippingZoneModel.create({
        name: 'Rest of the world',
        regions: ['everywhere'],
        methods: [],
      });

      return [restZone];
    }

    return zones;
  }

  async createZone(dto: CreateShippingZoneDto) {
    return this.shippingZoneModel.create({
      name: (dto.name || '').trim(),
      regions: dto.regions?.length ? dto.regions : ['everywhere'],
      methods: [],
    });
  }

  async updateZone(id: string, dto: CreateShippingZoneDto) {
    const update: any = {};

    if (dto.name !== undefined) update.name = (dto.name || '').trim();
    if (dto.regions !== undefined) update.regions = dto.regions;

    const zone = await this.shippingZoneModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!zone) throw new NotFoundException('Shipping zone not found');
    return zone;
  }

  async deleteZone(id: string) {
    await this.shippingZoneModel.findByIdAndDelete(id);
    return { success: true };
  }

  async addMethod(zoneId: string, dto: CreateShippingMethodDto) {
    const zone = await this.shippingZoneModel.findById(zoneId);
    if (!zone) throw new NotFoundException('Shipping zone not found');

    zone.methods.push({
      title: dto.title,
      type: dto.type,
      enabled: dto.enabled ?? true,
      cost: Number(dto.cost || 0),
      freeShippingRequirement: dto.freeShippingRequirement || 'no_requirement',
      minimumOrderAmount: Number(dto.minimumOrderAmount || 0),
    } as any);

    await zone.save();
    return zone;
  }

  async updateMethod(
    zoneId: string,
    methodId: string,
    dto: Partial<CreateShippingMethodDto>,
  ) {
    const zone = await this.shippingZoneModel.findById(zoneId);
    if (!zone) throw new NotFoundException('Shipping zone not found');

    const method: any = zone.methods.find(
      (item: any) => item._id?.toString() === methodId,
    );
    if (!method) throw new NotFoundException('Shipping method not found');

    method.title = dto.title ?? method.title;
    method.enabled = dto.enabled ?? method.enabled;
    method.cost = Number(dto.cost ?? method.cost);
    method.freeShippingRequirement =
      dto.freeShippingRequirement ?? method.freeShippingRequirement;
    method.minimumOrderAmount = Number(
      dto.minimumOrderAmount ?? method.minimumOrderAmount,
    );

    await zone.save();
    return zone;
  }

  async deleteMethod(zoneId: string, methodId: string) {
    const zone = await this.shippingZoneModel.findById(zoneId);
    if (!zone) throw new NotFoundException('Shipping zone not found');

    zone.methods = zone.methods.filter(
      (item: any) => item._id?.toString() !== methodId,
    );

    await zone.save();
    return zone;
  }

  // async checkoutOptions(total: number, region = 'everywhere') {
  //   console.log('checkoutOptions total=', total, 'region=', region);

  //   const zones = await this.shippingZoneModel.find();

  //   // If checkout sends "United States" we map it to continent "North America"
  //   const country = findCountry(region);
  //   const countryName = country?.name?.common; // United States
  //   const countryCode = country?.cca2; // US
  //   const continent =
  //     country?.continents?.[0] ?? country?.subregion ?? country?.region; // North America (best)

  //   // Priority:
  //   // 1) exact string match (maybe region is already "Africa"/"North America"/country name)
  //   // 2) match by resolved country name / code
  //   // 3) match by continent
  //   // 4) fallback everywhere
  //   const zone =
  //     zones.find((z) => matchRegion(z.regions, region)) ||
  //     zones.find(
  //       (z) =>
  //         matchRegion(z.regions, countryName) || matchRegion(z.regions, countryCode),
  //     ) ||
  //     zones.find((z) => matchRegion(z.regions, continent)) ||
  //     zones.find((z) => matchRegion(z.regions, 'everywhere'));

  //   if (!zone) return [];

  //   const result = zone.methods
  //     .filter((m: any) => m.enabled)
  //     .filter((m: any) => {
  //       if (m.type !== 'free_shipping') return true;

  //       if (m.freeShippingRequirement === 'minimum_order') {
  //         return total >= Number(m.minimumOrderAmount || 0);
  //       }

  //       return true;
  //     })
  //     .map((m: any) => ({
  //       id: m._id,
  //       title: m.title,
  //       type: m.type,
  //       cost: m.type === 'free_shipping' ? 0 : Number(m.cost || 0),
  //     }));


  //     console.log(
  //             'zone methods:',
  //             JSON.stringify(zones[0].methods, null, 2),
  //           );
        

  //   console.log('shipping options result:', result);
  //   return result;
  // }



  async checkoutOptions(total: number, region = 'everywhere') {
   
    console.log('checkoutOptions total=', total, 'region=', region);
  
    const zones = await this.shippingZoneModel.find();
  
    const country = findCountry(region);
    const countryName = country?.name?.common; // United States
    const countryCode = country?.cca2; // US
    const continent =
  country?.region === 'Americas'
    ? country?.subregion // "North America" or "South America"
    : country?.region;
    // console.log('country raw:', JSON.stringify(country, null, 2));


    const zone =
      // if frontend sends "North America" directly
      zones.find((z) => matchRegion(z.regions, region)) ||
      // exact country / ISO match (if you store countries)
      zones.find((z) => matchRegion(z.regions, countryName) || matchRegion(z.regions, countryCode)) ||
      // continent match (Africa / North America / Asia ...)
      zones.find((z) => matchRegion(z.regions, continent)) ||
      // fallback
      zones.find((z) => matchRegion(z.regions, 'everywhere'));
  
    if (!zone) return [];
  
    console.log('countryName=', countryName);
    console.log('countryCode=', countryCode);
    console.log('continent=', continent);
    console.log('SELECTED ZONE =>', zone.name, zone.regions);
  
    const result = zone.methods
      .filter((m: any) => m.enabled)
      .filter((m: any) => {
        if (m.type !== 'free_shipping') return true;
        if (m.freeShippingRequirement === 'minimum_order') {
          return total >= Number(m.minimumOrderAmount || 0);
        }
        return true;
      })
      .map((m: any) => ({
        id: m._id,
        title: m.title,
        type: m.type,
        cost: m.type === 'free_shipping' ? 0 : Number(m.cost || 0),
      }));
  
    console.log('shipping options result:', result);
    return result;
  }
}