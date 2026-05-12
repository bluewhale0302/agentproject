import json
import os
import shutil
import subprocess
import sys
from typing import Any, Optional

try:
    from vllm import LLM, SamplingParams
    VLLM_AVAILABLE = True
except Exception:
    LLM = None
    SamplingParams = None
    VLLM_AVAILABLE = False

OLLAMA_AVAILABLE = shutil.which('ollama') is not None

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
    TRANSFORMERS_AVAILABLE = True
except Exception:
    AutoModelForCausalLM = None
    AutoTokenizer = None
    pipeline = None
    TRANSFORMERS_AVAILABLE = False


class VLLMService:
    def __init__(self, model_name: str = 'gpt2'):
        self.model_name = model_name
        self.llm: Optional[Any] = None
        self.generator: Optional[Any] = None

    def _init_vllm(self, model_name: str) -> None:
        if not VLLM_AVAILABLE:
            return

        try:
            self.llm = LLM(model=model_name)
            self.model_name = model_name
        except Exception as exc:
            self.llm = None
            raise RuntimeError(
                'vLLM 엔진 초기화에 실패했습니다. Windows 환경에서 vllm 확장 모듈이 없거나 GPU/CUDA 설정이 잘못되었을 수 있습니다. ' 
                f'원본 오류: {exc}'
            ) from exc

    def _init_transformers(self, model_name: str) -> None:
        if not TRANSFORMERS_AVAILABLE:
            raise RuntimeError('transformers 패키지가 필요합니다. pip install transformers')

        local_only = os.getenv('HF_LOCAL_FILES_ONLY', '0').lower() in ('1', 'true', 'yes')
        if os.getenv('HUGGINGFACE_HUB_DISABLE_SSL_VERIFY', '0').lower() in ('1', 'true', 'yes'):
            os.environ['HUGGINGFACE_HUB_DISABLE_SSL_VERIFY'] = '1'

        model_kwargs = {
            'local_files_only': local_only,
        }
        if model_name.lower().startswith('qwen'):
            model_kwargs['trust_remote_code'] = True

        try:
            tokenizer = AutoTokenizer.from_pretrained(model_name, **model_kwargs)
            model = AutoModelForCausalLM.from_pretrained(model_name, **model_kwargs)
            self.generator = pipeline('text-generation', model=model, tokenizer=tokenizer, device=-1)
            self.model_name = model_name
        except Exception as exc:
            self.generator = None
            raise RuntimeError(
                'Transformers 모델 로드에 실패했습니다. 인터넷 연결, SSL 인증서 또는 로컬 캐시 문제를 확인하세요. '
                'HF_LOCAL_FILES_ONLY=1 또는 HUGGINGFACE_HUB_DISABLE_SSL_VERIFY=1을 시도하거나, 로컬 모델 경로를 DEFAULT_MODEL에 설정하세요. '
                f'원본 오류: {exc}'
            ) from exc

    def generate(
        self,
        prompt: str,
        max_tokens: int = 256,
        temperature: float = 0.8,
        top_p: float = 0.95,
        model_name: Optional[str] = None,
    ) -> str:
        model_name = model_name or self.model_name
        model_load_error = None

        if self.llm is None and VLLM_AVAILABLE:
            try:
                self._init_vllm(model_name)
            except RuntimeError as exc:
                model_load_error = str(exc)
                self.llm = None

        if self.llm is not None and model_name != self.model_name:
            try:
                self._init_vllm(model_name)
            except RuntimeError as exc:
                model_load_error = str(exc)
                self.llm = None

        if self.llm is not None and SamplingParams is not None:
            sampling_params = SamplingParams(max_tokens=max_tokens, temperature=temperature, top_p=top_p)
            outputs = self.llm.generate(prompt, sampling_params=sampling_params)
            if outputs is None:
                raise RuntimeError('vLLM가 출력을 반환하지 않았습니다.')

            try:
                return ''.join([getattr(output, 'text', str(output)) for output in outputs])
            except Exception:
                return str(outputs)

        if self.generator is None or model_name != self.model_name:
            if TRANSFORMERS_AVAILABLE:
                try:
                    self._init_transformers(model_name)
                except RuntimeError as exc:
                    model_load_error = model_load_error or str(exc)

        if self.generator is not None:
            try:
                results = self.generator(
                    prompt,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    do_sample=True,
                )
                if results and isinstance(results, list):
                    return results[0].get('generated_text', str(results[0]))
                return str(results)
            except Exception as exc:
                model_load_error = model_load_error or str(exc)

        if OLLAMA_AVAILABLE:
            try:
                return self._generate_from_ollama(prompt, max_tokens, temperature, top_p)
            except RuntimeError as exc:
                model_load_error = model_load_error or str(exc)

        # Vercel에서는 Ollama 대신 transformers만 사용
        if TRANSFORMERS_AVAILABLE:
            try:
                return self._generate_from_transformers_only(prompt, max_tokens, temperature, top_p)
            except RuntimeError as exc:
                model_load_error = model_load_error or str(exc)

        if model_load_error:
            return (
                '모델을 불러올 수 없습니다. 현재 환경에서 자동 생성이 불가합니다. ' 
                f'오류: {model_load_error}'
            )

        raise RuntimeError(
            'Transformers를 사용할 수 없습니다. 패키지 설치 또는 모델 경로를 확인하세요.'
        )

    def _generate_from_transformers_only(self, prompt: str, max_tokens: int, temperature: float, top_p: float) -> str:
        """Transformers만을 사용한 텍스트 생성 (Vercel용)
        
        Args:
            prompt: 입력 프롬프트
            max_tokens: 최대 토큰 수
            temperature: 온도
            top_p: Top-P 샘플링
            
        Returns:
            생성된 텍스트
        """
        if not TRANSFORMERS_AVAILABLE:
            raise RuntimeError('transformers 패키지가 필요합니다.')

        local_only = os.getenv('HF_LOCAL_FILES_ONLY', '0').lower() in ('1', 'true', 'yes')
        if os.getenv('HUGGINGFACE_HUB_DISABLE_SSL_VERIFY', '0').lower() in ('1', 'true', 'yes'):
            os.environ['HUGGINGFACE_HUB_DISABLE_SSL_VERIFY'] = '1'

        model_kwargs = {
            'local_files_only': local_only,
            'device_map': 'auto',
            'torch_dtype': 'auto',
        }

        try:
            from transformers import pipeline
            
            # DialoGPT 모델용 파이프라인
            if 'DialoGPT' in self.model_name:
                generator = pipeline('text-generation', model=self.model_name, **model_kwargs)
                result = generator(prompt, max_length=max_tokens, temperature=temperature, do_sample=True, pad_token_id=50256)
                return result[0]['generated_text']
            else:
                # 일반 텍스트 생성 모델
                generator = pipeline('text-generation', model=self.model_name, **model_kwargs)
                result = generator(prompt, max_new_tokens=max_tokens, temperature=temperature, top_p=top_p, do_sample=True)
                return result[0]['generated_text']
                
        except Exception as exc:
            raise RuntimeError(f'Transformers 생성 실패: {exc}')

    def _generate_from_ollama(self, prompt: str, max_tokens: int, temperature: float, top_p: float) -> str:
        """Ollama CLI를 통한 텍스트 생성
        
        Args:
            prompt: 입력 프롬프트
            max_tokens: 최대 토큰 수
            temperature: 온도 (다양성)
            top_p: Top-P 샘플링
            
        Returns:
            생성된 텍스트
            
        Raises:
            RuntimeError: Ollama CLI 실행 실패 시
        """
        if not OLLAMA_AVAILABLE:
            raise RuntimeError('Ollama CLI가 설치되어 있지 않습니다.')

        command = [
            'ollama',
            'run',
            self.model_name,
            prompt,
            '--format',
            'json',
        ]
        
        try:
            process = subprocess.run(
                command, 
                capture_output=True, 
                text=True, 
                encoding='utf-8', 
                errors='replace',
                timeout=120
            )
            
            if process.returncode != 0:
                error_msg = process.stderr or 'Ollama CLI 실행 실패'
                raise RuntimeError(f'Ollama 오류: {error_msg}')

            try:
                data = json.loads(process.stdout)
                if isinstance(data, dict) and 'response' in data:
                    return data['response']
                return process.stdout.strip()
            except json.JSONDecodeError:
                return process.stdout.strip()
                
        except subprocess.TimeoutExpired:
            raise RuntimeError('Ollama 실행 시간 초과 (120초)')
        except Exception as exc:
            raise RuntimeError(f'Ollama 실행 중 오류: {exc}')

    def _generate_from_cli(self, prompt: str, max_tokens: int, temperature: float, top_p: float) -> str:
        command = [
            sys.executable,
            '-m',
            'vllm',
            '--model',
            self.model_name,
            '--prompt',
            prompt,
            '--max_tokens',
            str(max_tokens),
            '--temperature',
            str(temperature),
            '--top_p',
            str(top_p),
        ]
        process = subprocess.run(command, capture_output=True, text=True)
        if process.returncode != 0:
            raise RuntimeError(process.stderr or 'vLLM CLI 실행 실패')
        return process.stdout.strip()
