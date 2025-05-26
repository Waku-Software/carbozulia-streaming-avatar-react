export type Credentials = {
  agora_uid: number;
  agora_app_id: string;
  agora_channel: string;
  agora_token: string;
};

export type Session = {
  _id: string;
  // @deprecated, use credentials instead
  stream_urls?: Credentials;
  credentials: Credentials;
};

export type ApiResponse<T> = {
  code: number;
  msg: string;
  data: T;
};

export type Voice = {
  accent: string;
  description: string;
  language: string;
  preview: string;
  voice_id: string;
  name: string;
};

export type Language = {
  lang_code: string;
  lang_name: string;
  url: string;
};

export type Avatar = {
  name: string;
  from: number;
  gender: string;
  url: string;
  avatar_id: string;
  voice_id: string;
  thumbnailUrl: string;
  available: boolean;
};

export class ApiService {
  private openapiHost: string;
  private openapiToken: string;

  constructor(openapiHost: string, openapiToken: string) {
    this.openapiHost = openapiHost;
    this.openapiToken = openapiToken;
  }

  private async fetchApi(endpoint: string, method: string, body?: object) {
    const response = await fetch(`${this.openapiHost}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.openapiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const responseBody = await response.json();
    if (responseBody.code != 1000) {
      alert(responseBody.msg);
      throw new Error(responseBody.msg);
    }
    return responseBody.data;
  }

  public async createSession(data: { avatar_id: string; duration: number }): Promise<Session> {
    return this.fetchApi('/api/open/v4/liveAvatar/session/create', 'POST', data);
  }

  public async closeSession(id: string) {
    return this.fetchApi('/api/open/v4/liveAvatar/session/close', 'POST', {
      id,
    });
  }

  public async getLangList(): Promise<Language[]> {
    const data = await this.fetchApi('/api/open/v3/language/list', 'GET');
    return data?.lang_list;
  }

  public async getVoiceList(): Promise<Voice[]> {
    return this.fetchApi('/api/open/v3/voice/list', 'GET');
  }

  public async getAvatarList(type: string = 'open'): Promise<Avatar[]> {
    const data = await this.fetchApi(`/api/open/v4/liveAvatar/avatar/list?page=1&size=100&type=${type}`, 'GET');
    return data?.result;
  }
}
